/*
 * RUNNER TYPE REVEAL. Transparent, explainable rules: every type is decided by simple
 * numbers from your log, and the reveal shows you those numbers.
 * Thresholds are PLACEHOLDER. TODO: tune once real users have logged runs.
 */

/** The reveal unlocks after this many logged runs. */
export const REVEAL_AFTER_RUNS = 8

export const RUNNER_TYPES = [
  {
    id: 'diesel',
    name: 'Diesel',
    description: 'Same steady pace, rain or shine. Slow to start, impossible to stop.',
  },
  {
    id: 'sprinter',
    name: 'Sprinter',
    description: 'Easy runs bore you. Intervals, tempo, races: that’s where you come alive.',
  },
  {
    id: 'trail-goat',
    name: 'Trail Goat',
    description: 'Flat tarmac is for other people. You go where the hills are.',
  },
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'You stopped, and then you came back. That’s the hardest part, and you did it.',
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Monday to Friday is for surviving. Saturday and Sunday are for running.',
  },
  {
    id: 'data-goblin',
    name: 'Data Goblin',
    description: 'Splits, heart rate, notes. If it can be measured, you’ve measured it.',
  },
] as const

export type RunnerTypeId = (typeof RUNNER_TYPES)[number]['id']

export const TYPE_RULES = {
  /** Pace barely varies: spread (standard deviation ÷ average pace) at most this. */
  diesel: { maxPaceSpread: 0.07 },
  /** At least this share of runs are fast sessions or races. */
  sprinter: { minFastShare: 0.35 },
  /** At least this share of runs mention trails or hills in the title/notes. */
  trailGoat: {
    minTrailShare: 0.3,
    words: ['trail', 'hill', 'mountain', 'off-road', 'kopec', 'kopce', 'hory', 'les', 'terén'],
  },
  /** A break of at least this many days, followed by at least this many runs. */
  comebackKid: { minBreakDays: 21, minRunsAfter: 4 },
  /** At least this share of runs on Saturday or Sunday. */
  weekendWarrior: { minWeekendShare: 0.6 },
  /** At least this share of runs with km splits or heart rate. */
  dataGoblin: { minDetailShare: 0.6 },
} as const

/** When several types fit, the most distinctive wins. */
export const TYPE_PRIORITY: RunnerTypeId[] = [
  'comeback-kid',
  'trail-goat',
  'sprinter',
  'weekend-warrior',
  'data-goblin',
  'diesel',
]
