// Sanity limits for a logged run. They catch typos, not judge anyone.
// PLACEHOLDER: TODO confirm with the running coach.

export const LOG_LIMITS = {
  maxDistanceKm: 300,
  /** 2:00/km is faster than any world record; anything quicker is a typo. */
  fastestPaceSecPerKm: 120,
  /** 30:00/km is a slow walk; anything slower is probably a typo. */
  slowestPaceSecPerKm: 1800,
  minEffort: 1,
  maxEffort: 10,
  minHeartRate: 30,
  maxHeartRate: 250,
  maxNotesLength: 500,
} as const
