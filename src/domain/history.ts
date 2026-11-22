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
  // The onboarding answer describes the 30 days before onboarding, so it only counts
  // from the onboarding day until 30 days later (not for older, imported runs).
  const sinceOnboarding = profile ? daysBetween(profile.classChosenOn, input.onDate) : -1
  const fromProfile =
    profile && sinceOnboarding >= 0 && sinceOnboarding <= windowDays
      ? [profile.longestRunKm30d]
      : []
  return Math.max(0, ...fromRuns, ...fromProfile)
}
