/*
 * THE INSEAM LADDER and the rules to climb it.
 * The ladder (names + cm) is from the product brief. Everything else is PLACEHOLDER.
 */

export const INSEAM_LADDER = [
  { level: 1, name: 'Cargo shorts', inseamCm: 30 },
  { level: 2, name: 'Basketball baggies', inseamCm: 25 },
  { level: 3, name: 'Gym shorts', inseamCm: 20 },
  { level: 4, name: '“Serious runner”', inseamCm: 18 },
  { level: 5, name: '7-inch', inseamCm: 13 },
  { level: 6, name: '5-inch', inseamCm: 12.5 },
  { level: 7, name: '3-inch', inseamCm: 7.5 },
  { level: 8, name: 'Split shorts', inseamCm: 5 },
  { level: 9, name: 'Race briefs', inseamCm: 3 },
  { level: 10, name: 'Record Ghost micro splits', inseamCm: 2 },
] as const

export type Rung = (typeof INSEAM_LADDER)[number]
export const MAX_LEVEL = 10

/** Side split on the shorts from this level up (purely visual). */
export const SPLIT_FROM_LEVEL = 8

/**
 * Levels 2–6: reachable by anyone consistent. PLACEHOLDER.
 * xp: total XP earned. runs28: runs in the last 4 weeks.
 * fasterPct: estimated race time at least this % faster than when you started.
 */
export const CONSISTENCY_LEVELS = {
  2: { xp: 100, runs28: 4, fasterPct: 0 },
  3: { xp: 300, runs28: 6, fasterPct: 1 },
  4: { xp: 600, runs28: 8, fasterPct: 2 },
  5: { xp: 1000, runs28: 10, fasterPct: 3.5 },
  6: { xp: 1500, runs28: 12, fasterPct: 5 },
} as const

/**
 * Levels 7–9: top 30% / 10% / 3% of runners of your sex and age.
 * PLACEHOLDER: until real percentiles come from race-results data, the threshold is
 * the Czech record time × this multiplier, the same for every age group.
 * TODO: replace with percentile tables by sex × age group × distance.
 */
export const PERCENTILE_LEVELS = {
  7: { topPct: 30, recordMultiplier: 1.75 },
  8: { topPct: 10, recordMultiplier: 1.45 },
  9: { topPct: 3, recordMultiplier: 1.25 },
} as const
// Level 10 = Czech national record pace (see records.ts).

/** Runs shorter than this don't count for race-time estimates (too noisy). PLACEHOLDER. */
export const MIN_ESTIMATE_DISTANCE_KM = 2
/** Window for consistency and current speed. */
export const PROGRESS_WINDOW_DAYS = 28
/** Window for the speed levels 7–10 (best effort counts). */
export const SPEED_WINDOW_DAYS = 90

/**
 * REGRESS: shorts grow back one level (and a cargo pocket appears) when your EASY runs
 * over the last 4 weeks are clearly slower than the 4 weeks before. PLACEHOLDER.
 * Both windows need enough easy runs, so rest days and short breaks never count.
 */
export const REGRESS = { windowDays: 28, minEasyRuns: 3, slowerBySecPerKm: 10 } as const
