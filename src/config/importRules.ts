/*
 * GARMIN CSV IMPORT rules. Garmin Connect column names vary by language, app version
 * and settings, so we guess the mapping and the user can always correct it.
 */
import type { RunType } from './runTypes'

export const IMPORT_FIELDS = [
  'date',
  'distance',
  'duration',
  'activityType',
  'avgHr',
  'title',
] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

export const REQUIRED_FIELDS: readonly ImportField[] = ['date', 'distance', 'duration']

export const FIELD_LABELS: Record<ImportField, string> = {
  date: 'Date',
  distance: 'Distance',
  duration: 'Time',
  activityType: 'Activity type',
  avgHr: 'Average heart rate',
  title: 'Title',
}

/**
 * Header names we recognise (compared lower-case, ignoring spaces and punctuation).
 * English Garmin Connect first, then common variants and Czech.
 */
export const COLUMN_SYNONYMS: Record<ImportField, string[]> = {
  date: ['date', 'start time', 'starttime', 'activity date', 'datum'],
  distance: ['distance', 'distance km', 'distance (km)', 'distance mi', 'vzdálenost', 'vzdalenost'],
  duration: ['time', 'elapsed time', 'moving time', 'duration', 'total time', 'čas', 'cas'],
  activityType: ['activity type', 'type', 'sport', 'typ aktivity', 'typ'],
  avgHr: ['avg hr', 'average heart rate', 'avg heart rate', 'avg. hr', 'prům. tf', 'průměrná tf'],
  title: ['title', 'name', 'activity name', 'název', 'nazev'],
}

/** An activity counts as a run if its type contains one of these. */
export const RUN_ACTIVITY_WORDS = ['run', 'běh', 'beh']

/** Words in the title that tell us the run type. PLACEHOLDER: tune with real exports. */
export const TYPE_KEYWORDS: Record<Exclude<RunType, 'easy' | 'long'>, string[]> = {
  race: ['race', 'parkrun', 'závod', 'zavod', 'marathon', 'maraton'],
  fast: ['interval', 'tempo', 'fartlek', 'hill', 'repeats', 'track', 'speed', 'kopce'],
}

/** A run this many times the median imported distance (and at least `minKm`) counts as long. */
export const LONG_RUN_RULE = { timesMedian: 1.5, minKm: 8 } as const

/**
 * Garmin doesn't record effort on our 1–10 scale, so imported runs get an estimate per type.
 * PLACEHOLDER. Kept moderate so the "2 hard easy runs → rest day" rule never fires on a guess.
 */
export const IMPORTED_EFFORT: Record<RunType, number> = { easy: 4, long: 6, fast: 7, race: 9 }

/** Same date, distance within this and time within this → the same run (skipped as duplicate). */
export const DUPLICATE_TOLERANCE = { km: 0.05, seconds: 60 } as const

export const MILES_TO_KM = 1.609344
