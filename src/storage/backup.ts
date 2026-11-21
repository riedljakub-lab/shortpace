// JSON export/import of ALL app data: one file you can keep as a backup or move to another device.
import { todayIso } from '../domain/dates'
import type { Profile, Run } from '../domain/types'
import { isThemePreference, type ThemePreference } from '../theme/theme'
import { parseProfile } from './profileSchema'
import { parseRuns, sortRunsNewestFirst } from './runSchema'

export const BACKUP_APP = 'shortpace'
/** Bump when the backup shape changes; older backups then need a migration. */
export const BACKUP_VERSION = 1

export interface AppData {
  profile: Profile | null
  runs: Run[]
  theme: ThemePreference
}

export interface Backup extends AppData {
  app: typeof BACKUP_APP
  backupVersion: number
  exportedAt: string
}

export type ImportResult =
  | { ok: true; data: AppData; exportedAt: string; skippedRuns: number }
  | { ok: false; error: string }

export function buildBackup(data: AppData, now: Date = new Date()): Backup {
  return { app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

export function backupFileName(now: Date = new Date()): string {
  return `shortpace-backup-${todayIso(now)}.json`
}

const NOT_A_BACKUP = 'This file isn’t a ShortPace backup.'

/** Reads a backup file's text. Checks everything before anything is replaced. */
export function parseBackup(text: string): ImportResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: `${NOT_A_BACKUP} It isn’t valid JSON.` }
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: NOT_A_BACKUP }
  const b = raw as Record<string, unknown>

  if (b.app !== BACKUP_APP) return { ok: false, error: NOT_A_BACKUP }
  if (typeof b.backupVersion !== 'number' || b.backupVersion > BACKUP_VERSION) {
    return {
      ok: false,
      error: 'This backup comes from a newer version of ShortPace. Reload the app and try again.',
    }
  }
  if (!Array.isArray(b.runs)) {
    return { ok: false, error: 'This backup is damaged: the runs are missing.' }
  }

  let profile: Profile | null = null
  if (b.profile !== null && b.profile !== undefined) {
    profile = parseProfile(b.profile)
    if (!profile) return { ok: false, error: 'This backup is damaged: the profile isn’t valid.' }
  }

  const { runs, invalid } = parseRuns(b.runs)
  return {
    ok: true,
    data: {
      profile,
      runs: sortRunsNewestFirst(runs),
      theme: isThemePreference(b.theme) ? b.theme : 'system',
    },
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    skippedRuns: invalid,
  }
}
