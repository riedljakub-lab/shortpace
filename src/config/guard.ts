/*
 * OVERTRAINING GUARD settings. PLACEHOLDER values; TODO: confirm with the running coach.
 * Warnings from the guard never block, and can never be dismissed or bought away with coins.
 */

export const GUARD_RULES = {
  /**
   * Single-run spike (the primary guard): a run more than this much longer than the
   * longest run of the previous 30 days gets a warning. 0.10 = 10%.
   */
  spikeThreshold: 0.1,
  spikeWindowDays: 30,

  /** Effort rule: this many EASY runs rated at least `minEffort` within `windowDays` → rest day. */
  effortRule: { minEffort: 8, count: 2, windowDays: 7 },
} as const
