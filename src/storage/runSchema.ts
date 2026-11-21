// Checks that data read from storage (or an imported backup) really is a valid Run.
import { RUN_TYPE_IDS } from '../config/runTypes'
import { isIsoDate } from '../domain/dates'
import type { Run } from '../domain/types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isPositive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

export function parseRun(v: unknown): Run | null {
  if (!isObj(v)) return null
  if (
    typeof v.id !== 'string' ||
    v.id === '' ||
    !isIsoDate(v.date) ||
    !isPositive(v.distanceKm) ||
    !isPositive(v.durationSec) ||
    !isOneOf(RUN_TYPE_IDS, v.type) ||
    !Number.isInteger(v.effort) ||
    (v.effort as number) < 1 ||
    (v.effort as number) > 10 ||
    (v.source !== 'manual' && v.source !== 'garmin') ||
    typeof v.createdAt !== 'string'
  ) {
    return null
  }
  if (v.avgHeartRate !== undefined && !isPositive(v.avgHeartRate)) return null
  if (v.notes !== undefined && typeof v.notes !== 'string') return null
  if (
    v.splitsSecPerKm !== undefined &&
    !(Array.isArray(v.splitsSecPerKm) && v.splitsSecPerKm.every(isPositive))
  ) {
    return null
  }

  const run: Run = {
    id: v.id,
    date: v.date,
    distanceKm: v.distanceKm,
    durationSec: v.durationSec,
    type: v.type,
    effort: v.effort as number,
    source: v.source,
    createdAt: v.createdAt,
  }
  if (v.avgHeartRate !== undefined) run.avgHeartRate = v.avgHeartRate
  if (v.notes !== undefined) run.notes = v.notes
  if (v.splitsSecPerKm !== undefined) run.splitsSecPerKm = v.splitsSecPerKm as number[]
  return run
}

/** Keeps the valid runs from a list and counts the ones that were dropped. */
export function parseRuns(v: unknown): { runs: Run[]; invalid: number } {
  if (!Array.isArray(v)) return { runs: [], invalid: 0 }
  const runs = v.map(parseRun).filter((r): r is Run => r !== null)
  return { runs, invalid: v.length - runs.length }
}

/** Newest first: by date, then by when it was logged. */
export function sortRunsNewestFirst(runs: readonly Run[]): Run[] {
  return [...runs].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )
}
