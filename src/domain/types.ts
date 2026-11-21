import type { AvatarId } from '../config/avatars'
import type { DistanceClassId } from '../config/distances'
import type { PersonaId } from '../config/personas'
import type { RunType } from '../config/runTypes'
import type { Weekday } from './dates'

/** "unspecified" = "Prefer not to say"; comparisons then use the men's thresholds as a neutral default. */
export const SEXES = ['men', 'women', 'unspecified'] as const
export type Sex = (typeof SEXES)[number]

/** What we know about current fitness. Feeds the reality check in M3. */
export type Baseline =
  | { kind: 'race'; distance: DistanceClassId; timeSec: number }
  | { kind: 'easyPace'; secPerKm: number }
  | { kind: 'unknown' }

/** Everything onboarding collects. Saved through src/storage. */
export interface Profile {
  avatarId: AvatarId
  distanceClass: DistanceClassId
  /** Local date (YYYY-MM-DD) the class was picked; starts the 30-day lock. */
  classChosenOn: string
  persona: PersonaId
  sex: Sex
  age: number
  hasInjury: boolean
  runDays: Weekday[]
  longRunDay: Weekday
  longestRunKm30d: number
  canRun30Min: boolean
  ranRegularly3Months: boolean
  baseline: Baseline
  goalPaceSecPerKm: number
  /** ISO timestamp. */
  createdAt: string
}

/** One logged run. Saved through src/storage. */
export interface Run {
  id: string
  /** Local date YYYY-MM-DD. */
  date: string
  distanceKm: number
  durationSec: number
  type: RunType
  /** 1 = very easy, 10 = all-out. */
  effort: number
  avgHeartRate?: number
  notes?: string
  /** Optional pace per km in seconds, e.g. [331, 328, 340]. */
  splitsSecPerKm?: number[]
  /** Where it came from: typed in, or imported from a Garmin CSV (M9). */
  source: 'manual' | 'garmin'
  /** ISO timestamp. */
  createdAt: string
}
