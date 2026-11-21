// The "Log a run" form while it's being filled in, plus its validation.
import { LOG_LIMITS as L } from '../../config/logRules'
import type { RunType } from '../../config/runTypes'
import { isIsoDate } from '../../domain/dates'
import { formatPace, paceFromTime, parseDuration, parseKm, parsePace } from '../../domain/pace'
import type { Run } from '../../domain/types'

export interface RunDraft {
  date: string
  distanceKm: string
  duration: string
  type: RunType
  /** '1'…'10', or '' until chosen. */
  effort: string
  avgHeartRate: string
  notes: string
  /** Optional, e.g. "5:31, 5:28, 5:40". */
  splits: string
}

export type RunDraftErrors = Partial<Record<keyof RunDraft, string>>

export function emptyRunDraft(today: string): RunDraft {
  return {
    date: today,
    distanceKm: '',
    duration: '',
    type: 'easy',
    effort: '',
    avgHeartRate: '',
    notes: '',
    splits: '',
  }
}

/** "5:31, 5:28; 5:40" → [331, 328, 340]. Commas, semicolons or spaces. null if any part is invalid. */
export function parseSplits(text: string): number[] | null {
  const parts = text
    .split(/[,;\s]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const splits = parts.map(parsePace)
  return splits.every((s): s is number => s !== null) ? splits : null
}

/** Pace to show while typing, or null until distance and time make sense. */
export function livePace(d: RunDraft): number | null {
  const km = parseKm(d.distanceKm)
  const sec = parseDuration(d.duration)
  return km && sec ? paceFromTime(sec, km) : null
}

/** Error message per field. Empty object = ready to save. */
export function validateRunDraft(d: RunDraft, today: string): RunDraftErrors {
  const e: RunDraftErrors = {}

  if (!isIsoDate(d.date)) e.date = 'Pick the date of your run.'
  else if (d.date > today) e.date = 'That date is in the future. Log runs after you’ve done them.'

  const km = parseKm(d.distanceKm)
  if (km === null || km <= 0 || km > L.maxDistanceKm) {
    e.distanceKm = 'Enter the distance in km, like 8 or 8.5.'
  }

  const sec = parseDuration(d.duration)
  if (sec === null || sec <= 0) {
    e.duration = 'Enter the time as mm:ss or h:mm:ss, like 45:10 or 1:02:30.'
  } else if (km && !e.distanceKm) {
    const pace = paceFromTime(sec, km)
    if (pace < L.fastestPaceSecPerKm) {
      e.duration = `That’s ${formatPace(pace)} /km, faster than any world record. Check the distance and time.`
    } else if (pace > L.slowestPaceSecPerKm) {
      e.duration = `That’s ${formatPace(pace)} /km, slower than walking. Check the distance and time.`
    }
  }

  if (d.effort === '') e.effort = 'Rate how hard it felt, from 1 to 10.'

  if (d.avgHeartRate.trim() !== '') {
    const hr = Number(d.avgHeartRate.trim())
    if (!Number.isInteger(hr) || hr < L.minHeartRate || hr > L.maxHeartRate) {
      e.avgHeartRate = 'Enter beats per minute as a whole number, like 150, or leave it empty.'
    }
  }

  if (d.notes.length > L.maxNotesLength) {
    e.notes = `Keep notes under ${L.maxNotesLength} characters.`
  }

  if (d.splits.trim() !== '') {
    const splits = parseSplits(d.splits)
    if (!splits) {
      e.splits = 'Enter each km as m:ss, separated by commas, like 5:31, 5:28, 5:40.'
    } else if (km && splits.length > Math.ceil(km)) {
      e.splits = `That’s ${splits.length} splits for a ${km} km run. Enter one per km.`
    }
  }

  return e
}

/** Turns a valid draft into a Run. Throws if it isn't valid. */
export function draftToRun(d: RunDraft, opts: { id: string; now: Date; today: string }): Run {
  const km = parseKm(d.distanceKm)
  const sec = parseDuration(d.duration)
  if (Object.keys(validateRunDraft(d, opts.today)).length > 0 || km === null || sec === null) {
    throw new Error('Run is not valid')
  }
  const run: Run = {
    id: opts.id,
    date: d.date,
    distanceKm: km,
    durationSec: sec,
    type: d.type,
    effort: Number(d.effort),
    source: 'manual',
    createdAt: opts.now.toISOString(),
  }
  if (d.avgHeartRate.trim()) run.avgHeartRate = Number(d.avgHeartRate.trim())
  if (d.notes.trim()) run.notes = d.notes.trim()
  const splits = d.splits.trim() ? parseSplits(d.splits) : null
  if (splits?.length) run.splitsSecPerKm = splits
  return run
}

/** Random id for a new run. */
export function newRunId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `run-${Date.now()}-${Math.random().toString(36).slice(2)}`
  )
}
