/*
 * TRAINING PLAN RULES. Everything the plan generator decides comes from this file.
 * DRAFT: every number below is a PLACEHOLDER until a running coach reviews it.
 * The app shows "Draft plan, coach review pending" while this is true.
 */
import type { DistanceClassId } from './distances'

export const PLAN_IS_DRAFT = true

export const PLAN_RULES = {
  /** Most runs per week. Novices: 3. Experienced: up to 5 (never more than the days they picked). */
  maxRunsPerWeek: { novice: 3, experienced: 5 },

  /** Weeks of easy-only running before any quality session. */
  baseWeeks: { novice: 4, experienced: 0 },
  /** Couch Potato persona ("novice-start" flavor) gets this many extra base weeks. */
  extraBaseWeeksNoviceStart: 2,

  /** Quality (hard) sessions per week after the base phase. */
  qualityPerWeek: { novice: 1, experiencedUpTo3Runs: 1, experienced4PlusRuns: 2 },

  /** Session kinds that count as "hard". Two hard days are never placed next to each other. */
  hardSessions: ['long', 'quality'] as const,

  /** Gym Girlie persona ("strength-days" flavor) gets strength sessions on non-run days. */
  strengthDaysPerWeek: { novice: 1, experienced: 2 },
  /** Always keep at least this many full rest days. */
  minRestDays: 1,

  /** Long run grows at most 10% over the longest run of the last 30 days (matches the spike guard). */
  longRunGrowth: 0.1,
  minLongRunKm: 2,
  longRunCapKm: { '5k': 8, '10k': 14, half: 21, marathon: 32 } satisfies Record<
    DistanceClassId,
    number
  >,

  /** Easy run length in minutes. */
  easyMinutes: {
    novice: 25,
    experienced: { '5k': 30, '10k': 40, half: 45, marathon: 50 } satisfies Record<
      DistanceClassId,
      number
    >,
  },
} as const

/** What a quality session looks like. The persona picks which kind comes first. */
export const QUALITY_SESSIONS = {
  tempo: {
    title: 'Tempo run',
    detail: '10 min easy, 15–20 min comfortably hard, 10 min easy.',
  },
  intervals: {
    title: 'Intervals',
    detail: '10 min easy, 6 × 400 m fast with 90 s easy jog between, 10 min easy.',
  },
  hills: {
    title: 'Hill repeats',
    detail: '10 min easy, 6 × 60 s uphill strong, walk or jog down, 10 min easy.',
  },
} as const

export type QualityKind = keyof typeof QUALITY_SESSIONS

/** Order of quality kinds per persona flavor (first = their favourite). */
export const QUALITY_ORDER: Record<string, QualityKind[]> = {
  tempo: ['tempo', 'intervals', 'hills'],
  intervals: ['intervals', 'tempo', 'hills'],
  hills: ['hills', 'tempo', 'intervals'],
  default: ['tempo', 'intervals', 'hills'],
}

export const SESSION_COPY = {
  easy: { title: 'Easy run', detail: 'Relaxed pace. You should be able to chat.' },
  runWalk: {
    title: 'Run/walk',
    detail: 'Alternate 1 min running and 1 min walking. Walking is part of the plan.',
  },
  long: { title: 'Long run', detail: 'Slow and steady. Distance matters, pace doesn’t.' },
  strength: { title: 'Strength', detail: '30 min legs and core. Squats, lunges, planks.' },
  rest: { title: 'Rest day', detail: 'Recovery is training too. Rest days earn XP.' },
} as const
