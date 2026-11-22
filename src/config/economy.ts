/*
 * XP and COINS. All amounts are PLACEHOLDER values. TODO: tune after playtesting.
 * XP = progress, never spent or lost. Coins = earned currency (no real money in the MVP).
 * Only runs from the day you started (onboarding) onwards earn anything, so importing
 * years of old runs doesn't hand out a fortune.
 */

export const EARNINGS = {
  xp: {
    perRun: 10,
    perKm: 2,
    /** A planned rest day that passed with no run logged. */
    perRestDay: 5,
    /** A full week (Mon–Sun) where you logged at least the planned number of runs. */
    weekComplete: 25,
  },
  coins: {
    perRun: 5,
    perRestDay: 2,
    weekComplete: 10,
    /** Extra coins per week of a streak of complete weeks (2nd week +5, 3rd +10, ...). */
    streakBonusPerWeek: 5,
    maxStreakBonus: 25,
  },
} as const

/**
 * Switching distance class after the 30-day lock costs coins. PLACEHOLDER.
 * Coins can never skip the lock, a safety warning or a rest day.
 */
export const CLASS_SWITCH_COST = 100
