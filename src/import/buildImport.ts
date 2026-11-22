// Turns parsed CSV rows into runs to import, plus a clear list of what was skipped and why.
import {
  DUPLICATE_TOLERANCE,
  IMPORTED_EFFORT,
  LONG_RUN_RULE,
  MILES_TO_KM,
  TYPE_KEYWORDS,
  type ImportField,
} from '../config/importRules'
import { LOG_LIMITS } from '../config/logRules'
import type { RunType } from '../config/runTypes'
import { formatKm, formatPace, paceFromTime } from '../domain/pace'
import type { Run } from '../domain/types'
import {
  isRunActivity,
  parseDateLoose,
  parseDurationLoose,
  parseNumberLoose,
  type ParsedCsv,
} from './csv'

export interface ImportOptions {
  mapping: Partial<Record<ImportField, string>>
  unit: 'km' | 'mi'
}

export interface SkippedRow {
  /** Row number as a spreadsheet shows it (the header is row 1). */
  row: number
  reason: string
}

export interface ImportPlan {
  runs: Run[]
  skipped: SkippedRow[]
}

type Candidate = Omit<Run, 'type' | 'effort'> & { typeFromTitle: RunType | null }

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

function typeFromTitle(title: string): RunType | null {
  const text = title.toLowerCase()
  if (TYPE_KEYWORDS.race.some((w) => text.includes(w))) return 'race'
  if (TYPE_KEYWORDS.fast.some((w) => text.includes(w))) return 'fast'
  return null
}

function isSameRun(
  a: Pick<Run, 'date' | 'distanceKm' | 'durationSec'>,
  b: Pick<Run, 'date' | 'distanceKm' | 'durationSec'>,
) {
  return (
    a.date === b.date &&
    Math.abs(a.distanceKm - b.distanceKm) <= DUPLICATE_TOLERANCE.km &&
    Math.abs(a.durationSec - b.durationSec) <= DUPLICATE_TOLERANCE.seconds
  )
}

export function buildImport(
  csv: ParsedCsv,
  options: ImportOptions,
  existing: readonly Run[],
  ctx: { today: string; now: Date; newId: () => string },
): ImportPlan {
  const { mapping } = options
  const get = (row: Record<string, string>, field: ImportField) => {
    const column = mapping[field]
    return column ? (row[column] ?? '').trim() : ''
  }
  const skipped: SkippedRow[] = []
  const accepted: Candidate[] = []

  csv.rows.forEach((row, i) => {
    const rowNumber = i + 2
    const skip = (reason: string) => skipped.push({ row: rowNumber, reason })

    if (mapping.activityType) {
      const activity = get(row, 'activityType')
      if (!isRunActivity(activity)) return skip(`Not a run (${activity || 'no activity type'})`)
    }

    const rawDate = get(row, 'date')
    const date = parseDateLoose(rawDate)
    if (!date) return skip(`Couldn’t read the date “${rawDate}”`)
    if (date > ctx.today) return skip('Date is in the future')

    const rawDistance = get(row, 'distance')
    const distance = parseNumberLoose(rawDistance)
    if (distance === null) return skip(`Couldn’t read the distance “${rawDistance}”`)
    const km = Math.round(distance * (options.unit === 'mi' ? MILES_TO_KM : 1) * 100) / 100
    if (km <= 0 || km > LOG_LIMITS.maxDistanceKm)
      return skip(`Distance looks wrong (${formatKm(km)} km)`)

    const rawTime = get(row, 'duration')
    const seconds = parseDurationLoose(rawTime)
    if (!seconds) return skip(`Couldn’t read the time “${rawTime}”`)

    const pace = paceFromTime(seconds, km)
    if (pace < LOG_LIMITS.fastestPaceSecPerKm || pace > LOG_LIMITS.slowestPaceSecPerKm) {
      return skip(`Pace looks impossible (${formatPace(pace)} /km)`)
    }

    const candidate = { date, distanceKm: km, durationSec: seconds }
    if (existing.some((r) => isSameRun(r, candidate))) return skip('Already in your log')
    if (accepted.some((r) => isSameRun(r, candidate))) return skip('Appears twice in this file')

    const hr = parseNumberLoose(get(row, 'avgHr'))
    const title = get(row, 'title').slice(0, LOG_LIMITS.maxNotesLength)
    const run: Candidate = {
      id: ctx.newId(),
      ...candidate,
      source: 'garmin',
      createdAt: ctx.now.toISOString(),
      typeFromTitle: title ? typeFromTitle(title) : null,
    }
    if (
      hr !== null &&
      Number.isInteger(hr) &&
      hr >= LOG_LIMITS.minHeartRate &&
      hr <= LOG_LIMITS.maxHeartRate
    ) {
      run.avgHeartRate = hr
    }
    if (title) run.notes = title
    accepted.push(run)
  })

  // Run types: from the title when it says so; otherwise "long" if well above your usual distance.
  const longFrom = Math.max(
    LONG_RUN_RULE.minKm,
    LONG_RUN_RULE.timesMedian * median(accepted.map((r) => r.distanceKm)),
  )
  const runs: Run[] = accepted.map(({ typeFromTitle: fromTitle, ...rest }) => {
    const type: RunType = fromTitle ?? (rest.distanceKm >= longFrom ? 'long' : 'easy')
    return { ...rest, type, effort: IMPORTED_EFFORT[type] }
  })

  return { runs, skipped }
}

/** Groups skip reasons for the report: "Not a run" ×3 (rows 4, 7, 9). */
export function summariseSkipped(
  skipped: readonly SkippedRow[],
): { reason: string; rows: number[] }[] {
  const groups = new Map<string, number[]>()
  for (const s of skipped) {
    const key = s.reason.startsWith('Not a run') ? 'Not a run' : s.reason
    groups.set(key, [...(groups.get(key) ?? []), s.row])
  }
  return [...groups].map(([reason, rows]) => ({ reason, rows }))
}
