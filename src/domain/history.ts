import { addDays, daysBetween } from './dates'
import type { Profile, Run } from './types'

export const RECENT_WINDOW_DAYS = 30

/**
 * Longest run in the 30 days BEFORE `onDate` (that day itself is not included).
 * The onboarding answer ("longest run in the last 30 days") counts while it's still recent,
 * so brand-new users without logged runs still get a sensible limit.
 */
export function longestRecentKm(input: {
  profile: Pick<Profile, 'longestRunKm30d' | 'classChosenOn'> | null
  runs: readonly Pick<Run, 'date' | 'distanceKm'>[]
  onDate: string
  windowDays?: number
}): number {
  const windowDays = input.windowDays ?? RECENT_WINDOW_DAYS
  const from = addDays(input.onDate, -windowDays)
  const fromRuns = input.runs
    .filter((r) => r.date >= from && r.date < input.onDate)
    .map((r) => r.distanceKm)
  const profile = input.profile
  const fromProfile =
    profile && daysBetween(profile.classChosenOn, input.onDate) <= windowDays
      ? [profile.longestRunKm30d]
      : []
  return Math.max(0, ...fromRuns, ...fromProfile)
}
