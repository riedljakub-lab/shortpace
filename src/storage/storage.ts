/*
 * THE storage module. Every read/write of saved data goes through here, so we can
 * swap localStorage for Supabase later without touching any screen.
 * Holds: theme preference (M1), profile (M2), runs (M4).
 */
import type { Profile, Run } from '../domain/types'
import { isThemePreference, type ThemePreference } from '../theme/theme'
import { parseProfile } from './profileSchema'
import { parseRuns, sortRunsNewestFirst } from './runSchema'

export const STORAGE_PREFIX = 'shortpace:'
/** Also read by the small script in index.html (prevents a white flash in dark mode). */
export const THEME_KEY = `${STORAGE_PREFIX}theme`
export const PROFILE_KEY = `${STORAGE_PREFIX}profile`
export const RUNS_KEY = `${STORAGE_PREFIX}runs`
/** Bump when the saved shape changes, and add a migration for the old version. */
export const PROFILE_VERSION = 1
export const RUNS_VERSION = 1

/** The methods we need from localStorage. Tests pass a fake one. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface PreferencesRepository {
  getThemePreference(): ThemePreference
  setThemePreference(preference: ThemePreference): void
}

export interface ProfileRepository {
  getProfile(): Profile | null
  /** Returns false if the browser refused to save (e.g. private mode, storage full). */
  saveProfile(profile: Profile): boolean
  deleteProfile(): void
}

export interface RunRepository {
  /** Newest first. Invalid entries are skipped, never crash the app. */
  listRuns(): Run[]
  /** Replaces the whole list (used by add, delete and import). False if the browser refused. */
  saveRuns(runs: readonly Run[]): boolean
}

/*
 * Storage can be missing or throw (private browsing, blocked cookies, full disk).
 * The app must still work, so every call is guarded and falls back to defaults.
 */

export function createPreferencesRepository(store: KeyValueStore | null): PreferencesRepository {
  return {
    getThemePreference() {
      try {
        const stored = store?.getItem(THEME_KEY)
        return isThemePreference(stored) ? stored : 'system'
      } catch {
        return 'system'
      }
    },
    setThemePreference(preference) {
      try {
        store?.setItem(THEME_KEY, preference)
      } catch {
        // Not saved; the choice still applies until the page is reloaded.
      }
    },
  }
}

export function createProfileRepository(store: KeyValueStore | null): ProfileRepository {
  return {
    getProfile() {
      try {
        const raw = store?.getItem(PROFILE_KEY)
        if (!raw) return null
        const saved: unknown = JSON.parse(raw)
        // Saved as { version, profile } so future formats can be migrated.
        if (typeof saved !== 'object' || saved === null) return null
        const { version, profile } = saved as { version?: unknown; profile?: unknown }
        return version === PROFILE_VERSION ? parseProfile(profile) : null
      } catch {
        return null
      }
    },
    saveProfile(profile) {
      try {
        if (!store) return false
        store.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile }))
        return true
      } catch {
        return false
      }
    },
    deleteProfile() {
      try {
        store?.removeItem(PROFILE_KEY)
      } catch {
        // Nothing saved to delete.
      }
    },
  }
}

export function createRunRepository(store: KeyValueStore | null): RunRepository {
  return {
    listRuns() {
      try {
        const raw = store?.getItem(RUNS_KEY)
        if (!raw) return []
        const saved: unknown = JSON.parse(raw)
        if (typeof saved !== 'object' || saved === null) return []
        const { version, runs } = saved as { version?: unknown; runs?: unknown }
        return version === RUNS_VERSION ? sortRunsNewestFirst(parseRuns(runs).runs) : []
      } catch {
        return []
      }
    },
    saveRuns(runs) {
      try {
        if (!store) return false
        store.setItem(RUNS_KEY, JSON.stringify({ version: RUNS_VERSION, runs }))
        return true
      } catch {
        return false
      }
    },
  }
}

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const preferences = createPreferencesRepository(browserStore())
export const profiles = createProfileRepository(browserStore())
export const runLog = createRunRepository(browserStore())
