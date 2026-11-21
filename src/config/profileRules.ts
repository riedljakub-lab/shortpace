// Limits for onboarding answers.
// PLACEHOLDER: sensible defaults for now. TODO: confirm with the running coach.

export const PROFILE_LIMITS = {
  minAge: 14,
  maxAge: 99,
  /** A plan needs at least one long run plus one other run. */
  minRunDays: 2,
  maxLongestRunKm: 100,
  /** Goal pace sanity range in seconds per km (2:30 to 15:00). Not a judgement, just typo protection. */
  fastestPaceSecPerKm: 150,
  slowestPaceSecPerKm: 900,
} as const

/** The first N days after picking a distance class, switching is not possible. */
export const CLASS_LOCK_DAYS = 30
