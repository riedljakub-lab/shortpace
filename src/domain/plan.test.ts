import { describe, expect, it } from 'vitest'
import { PERSONA_IDS, type PersonaId } from '../config/personas'
import { addDays, mondayOf, weekdayOf, WEEKDAY_IDS, type Weekday } from './dates'
import { checkSpike } from './guard'
import { longestRecentKm } from './history'
import {
  chooseRunDays,
  cyclicDistance,
  generateWeekPlan,
  longRunTargetKm,
  planWeekNumber,
  type WeekPlan,
} from './plan'

const START = '2026-11-16' // a Monday
const NOVICE = { canRun30Min: false, ranRegularly3Months: false }
const EXPERIENCED = { canRun30Min: true, ranRegularly3Months: true }

function profile(over: {
  runDays: Weekday[]
  longRunDay: Weekday
  persona?: PersonaId
  level?: typeof NOVICE
}) {
  return {
    distanceClass: '10k' as const,
    persona: over.persona ?? 'weekend-warrior',
    runDays: over.runDays,
    longRunDay: over.longRunDay,
    classChosenOn: START,
    ...(over.level ?? EXPERIENCED),
  }
}

/** Every set of 2–7 weekdays. */
function allDaySets(): Weekday[][] {
  const sets: Weekday[][] = []
  for (let mask = 1; mask < 128; mask++) {
    const set = WEEKDAY_IDS.filter((_, i) => mask & (1 << i))
    if (set.length >= 2) sets.push(set)
  }
  return sets
}

const runsIn = (plan: WeekPlan) =>
  plan.days.filter((d) => ['easy', 'long', 'quality'].includes(d.session.kind))
const hardDaysIn = (plan: WeekPlan) => plan.days.filter((d) => d.session.hard).map((d) => d.day)

describe('plan generator: rules hold for EVERY combination', () => {
  const sets = allDaySets()
  const cases: { label: string; plan: WeekPlan; p: ReturnType<typeof profile>; novice: boolean }[] =
    []
  for (const runDays of sets) {
    for (const longRunDay of runDays) {
      for (const persona of PERSONA_IDS) {
        for (const [novice, level] of [
          [true, NOVICE],
          [false, EXPERIENCED],
        ] as const) {
          const p = profile({ runDays, longRunDay, persona, level })
          for (const week of [START, addDays(START, 7 * 12)]) {
            cases.push({
              label: `${runDays.join(',')} long=${longRunDay} ${persona} ${novice ? 'novice' : 'exp'} ${week}`,
              plan: generateWeekPlan({ profile: p, weekOf: week, longestRecentKm: 10 }),
              p,
              novice,
            })
          }
        }
      }
    }
  }

  it(`checks ${cases.length} generated weeks`, () => {
    expect(cases.length).toBeGreaterThan(10_000)
  })

  it('always has 7 days, Monday to Sunday', () => {
    for (const { plan, label } of cases) {
      expect(
        plan.days.map((d) => d.day),
        label,
      ).toEqual(WEEKDAY_IDS)
      expect(weekdayOf(plan.startDate), label).toBe('mon')
    }
  })

  it('novices run 3 times a week at most, experienced runners 5, never more than the days picked', () => {
    for (const { plan, p, novice, label } of cases) {
      const expected = Math.min(p.runDays.length, novice ? 3 : 5)
      expect(runsIn(plan).length, label).toBe(expected)
      for (const d of runsIn(plan)) expect(p.runDays, label).toContain(d.day)
    }
  })

  it('always has exactly one long run, on the chosen long-run day', () => {
    for (const { plan, p, label } of cases) {
      const longs = plan.days.filter((d) => d.session.kind === 'long')
      expect(
        longs.map((d) => d.day),
        label,
      ).toEqual([p.longRunDay])
    }
  })

  it('has no quality sessions in the base phase', () => {
    for (const { plan, label } of cases) {
      if (plan.phase !== 'base') continue
      expect(
        plan.days.filter((d) => d.session.kind === 'quality'),
        label,
      ).toEqual([])
    }
  })

  it('never puts two hard days in a row (Sunday → Monday counts too)', () => {
    for (const { plan, label } of cases) {
      const hard = hardDaysIn(plan)
      for (const a of hard) {
        for (const b of hard) {
          if (a !== b)
            expect(cyclicDistance(a, b), `${label}: ${a} & ${b}`).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  it('makes every other day a real rest day (or strength for Gym Girlie), keeping one full rest day', () => {
    for (const { plan, p, label } of cases) {
      const rest = plan.days.filter((d) => d.session.kind === 'rest')
      const strength = plan.days.filter((d) => d.session.kind === 'strength')
      expect(runsIn(plan).length + rest.length + strength.length, label).toBe(7)
      if (p.persona === 'gym-girlie') {
        if (7 - runsIn(plan).length >= 2) expect(strength.length, label).toBeGreaterThan(0)
      } else {
        expect(strength, label).toEqual([])
      }
      if (runsIn(plan).length < 7) expect(rest.length, label).toBeGreaterThanOrEqual(1)
    }
  })

  it('gives experienced runners quality sessions once the base phase is over (when there is room)', () => {
    const plan = generateWeekPlan({
      profile: profile({ runDays: ['tue', 'thu', 'sun'], longRunDay: 'sun' }),
      weekOf: addDays(START, 7 * 12),
      longestRecentKm: 10,
    })
    expect(plan.phase).toBe('build')
    expect(plan.days.filter((d) => d.session.kind === 'quality').map((d) => d.day)).toEqual(['thu'])
  })
})

describe('phases and personas', () => {
  it('novices start with a base phase; Couch Potato gets 2 extra base weeks', () => {
    const base = (persona: PersonaId, week: number) =>
      generateWeekPlan({
        profile: profile({
          runDays: ['tue', 'thu', 'sat'],
          longRunDay: 'sat',
          persona,
          level: NOVICE,
        }),
        weekOf: addDays(START, 7 * (week - 1)),
        longestRecentKm: 3,
      }).phase
    expect(base('trail-goat', 4)).toBe('base')
    expect(base('trail-goat', 5)).toBe('build')
    expect(base('couch-potato', 6)).toBe('base')
    expect(base('couch-potato', 7)).toBe('build')
  })

  it('experienced runners skip the base phase', () => {
    const plan = generateWeekPlan({
      profile: profile({ runDays: ['tue', 'thu', 'sat'], longRunDay: 'sat' }),
      weekOf: START,
      longestRecentKm: 10,
    })
    expect(plan.weekNumber).toBe(1)
    expect(plan.phase).toBe('build')
  })

  it('uses the persona’s favourite quality session first', () => {
    const firstQuality = (persona: PersonaId) =>
      generateWeekPlan({
        profile: profile({ runDays: ['mon', 'wed', 'fri', 'sun'], longRunDay: 'sun', persona }),
        weekOf: START,
        longestRecentKm: 10,
      }).days.find((d) => d.session.kind === 'quality')?.session.qualityKind
    expect(firstQuality('trail-goat')).toBe('hills')
    expect(firstQuality('track-rat')).toBe('intervals')
    expect(firstQuality('cloud-shoe-bro')).toBe('tempo')
  })

  it('gives novices who can’t run 30 minutes run/walk sessions in the base phase', () => {
    const plan = generateWeekPlan({
      profile: profile({
        runDays: ['tue', 'thu', 'sat'],
        longRunDay: 'sat',
        level: { canRun30Min: false, ranRegularly3Months: true },
      }),
      weekOf: START,
      longestRecentKm: 2,
    })
    expect(plan.days.filter((d) => d.session.title === 'Run/walk')).toHaveLength(2)
  })
})

describe('long run target', () => {
  const p = profile({ runDays: ['sat', 'tue'], longRunDay: 'sat' })

  it('grows at most 10% over the recent longest run, rounded down to 0.5 km', () => {
    expect(longRunTargetKm(p, 10)).toBe(11)
    expect(longRunTargetKm(p, 8.3)).toBe(9) // 9.13 → 9
    expect(longRunTargetKm(p, 6)).toBe(6.5) // 6.6 → 6.5
  })

  it('uses the fresh-start minimum only when there are no recent runs, and caps per class', () => {
    expect(longRunTargetKm(p, 0)).toBe(2)
    expect(longRunTargetKm(p, 30)).toBe(14) // 10K cap
  })

  it('never plans a big jump for someone with a short history', () => {
    expect(longRunTargetKm(p, 1)).toBe(1) // 1.1 → 1, not the 2 km minimum
    expect(longRunTargetKm(p, 1.5)).toBe(1.5) // 1.65 → 1.5
    expect(longRunTargetKm(p, 0.3)).toBe(0.3) // never rounds below what they already ran
  })
})

describe('helpers', () => {
  it('spreads run days apart and always keeps the long-run day', () => {
    // Sunday long run + 2 more: Wednesday is farthest from Sunday, then Friday (2 days from both).
    expect(chooseRunDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], 'sun', 3)).toEqual([
      'wed',
      'fri',
      'sun',
    ])
    expect(chooseRunDays(['mon', 'tue', 'sat'], 'sat', 2)).toEqual(['tue', 'sat'])
  })

  it('counts plan weeks from the week the class was chosen', () => {
    expect(planWeekNumber('2026-11-19', '2026-11-16')).toBe(1) // same week
    expect(planWeekNumber('2026-11-19', '2026-11-23')).toBe(2)
    expect(planWeekNumber('2026-11-19', '2027-01-04')).toBe(8)
  })

  it('finds weeks and weekdays correctly', () => {
    expect(mondayOf('2026-11-22')).toBe('2026-11-16') // Sunday → that week's Monday
    expect(weekdayOf('2026-11-21')).toBe('sat')
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
  })
})

describe('longestRecentKm', () => {
  const runs = [
    { date: '2026-11-20', distanceKm: 8 },
    { date: '2026-10-01', distanceKm: 21 }, // too old
    { date: '2026-11-21', distanceKm: 15 }, // the day itself doesn't count
  ]

  it('uses runs from the previous 30 days only', () => {
    expect(longestRecentKm({ profile: null, runs, onDate: '2026-11-21' })).toBe(8)
  })

  it('counts the onboarding answer while it is recent', () => {
    const p = { longestRunKm30d: 12, classChosenOn: '2026-11-10' }
    expect(longestRecentKm({ profile: p, runs, onDate: '2026-11-21' })).toBe(12)
    expect(longestRecentKm({ profile: p, runs: [], onDate: '2026-12-31' })).toBe(0)
  })
})

describe('plan and spike guard agree', () => {
  it('never schedules a long run more than 10% over the recent longest run', () => {
    for (const longest of [0.3, 0.9, 1, 1.5, 2.2, 3, 4.7, 8, 8.3, 10, 13.9, 25, 40]) {
      for (const distanceClass of ['5k', '10k', 'half', 'marathon'] as const) {
        const p = { ...profile({ runDays: ['tue', 'sat'], longRunDay: 'sat' }), distanceClass }
        const target = longRunTargetKm(p, longest)
        expect(checkSpike(target, longest).status, `${distanceClass} longest=${longest}`).not.toBe(
          'spike',
        )
      }
    }
  })
})
