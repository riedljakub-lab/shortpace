/*
 * THE storage module. Every read/write of saved data goes through here, so we can
 * swap localStorage for Supabase later without touching any screen.
 * M1: theme preference only. Later milestones add profile, runs, etc.
 */
import { isThemePreference, type ThemePreference } from '../theme/theme'

export const STORAGE_PREFIX = 'shortpace:'
/** Also read by the small script in index.html (prevents a white flash in dark mode). */
export const THEME_KEY = `${STORAGE_PREFIX}theme`

/** The two methods we need from localStorage. Tests pass a fake one. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface PreferencesRepository {
  getThemePreference(): ThemePreference
  setThemePreference(preference: ThemePreference): void
}

/**
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

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export const preferences = createPreferencesRepository(browserStore())
