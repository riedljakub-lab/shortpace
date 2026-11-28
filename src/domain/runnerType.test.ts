import { describe, expect, it } from 'vitest'
import type { Run } from './types'
import { sampleRun } from '../test/fixtures'
import { addDays } from './dates'
import { classifyRunner, runnerFeatures } from './runnerType'

/**
 * `count` runs starting on a Tuesday, every `everyDays` days.
 * Pace in s/km; `over(i)` customises run i.
 */
function log(
  count: number,
  opts: {
    start?: string
    everyDays?: number
    pace?: number
    over?: (i: number) => Partial<Run>
  } = {},
): Run[] {
  const { start = '2026-09-01', everyDays = 2, pace = 330, over = () => ({}) } = opts
  return Array.from({ length: count }, (_, i) =>
    sampleRun({
      id: `r${i}`,
      date: addDays(start, i * everyDays),
      distanceKm: 6,
      durationSec: 6 * pace,
      ...over(i),
    }),
  )
}

describe('runner type reveal', () => {
  it('waits until there are 8 runs', () => {
    expect(classifyRunner(log(7))).toBeNull()
    expect(classifyRunner(log(8))).not.toBeNull()
  })

  it('Diesel: the same steady pace every time', () => {
    const result = classifyRunner(
      log(10, { over: (i) => ({ durationSec: 6 * (330 + (i % 3) * 3) }) }),
    )
    expect(result?.type).toBe('diesel')
    expect(result?.clearMatch).toBe(true)
    expect(result?.facts[0]).toMatch(
      /Your pace barely changes: most runs are within ±\d+ s\/km of 5:3\d \/km\./,
    )
  })

  it('Sprinter: lots of fast sessions and races', () => {
    const result = classifyRunner(
      log(10, {
        over: (i) =>
          i % 2 ? { type: 'fast', durationSec: 6 * 270 } : { type: 'easy', durationSec: 6 * 360 },
      }),
    )
    expect(result?.type).toBe('sprinter')
    expect(result?.facts[0]).toBe('5 of your 10 runs (50%) were fast sessions or races.')
  })

  it('Trail Goat: titles and notes mention trails or hills', () => {
    const result = classifyRunner(
      log(10, {
        over: (i) => ({
          notes: i < 4 ? 'Trail Running' : 'Morning run',
          durationSec: 6 * (300 + i * 12),
        }),
      }),
    )
    expect(result?.type).toBe('trail-goat')
    expect(result?.facts[0]).toBe('4 of your 10 runs (40%) mention trails or hills.')
  })

  it('Comeback Kid: a long break, then back at it', () => {
    const before = log(5, { start: '2026-08-01', pace: 300 })
    const after = log(5, { start: '2026-09-20', pace: 360 }).map((r) => ({ ...r, id: `b-${r.id}` }))
    const result = classifyRunner([...before, ...after])
    expect(result?.type).toBe('comeback-kid')
    expect(result?.facts[0]).toBe(
      'You took a 42-day break (Sun 9 Aug to Sun 20 Sept) and came back with 5 runs since.',
    )
  })

  it('Weekend Warrior: mostly Saturdays and Sundays', () => {
    // Alternate Saturday (5 Sep) and Sunday (6 Sep) for 5 weeks, with paces all over the place.
    const runs = Array.from({ length: 10 }, (_, i) =>
      sampleRun({
        id: `w${i}`,
        date: addDays('2026-09-05', Math.floor(i / 2) * 7 + (i % 2)),
        distanceKm: 6,
        durationSec: 6 * (290 + (i % 4) * 25),
      }),
    )
    const result = classifyRunner(runs)
    expect(result?.type).toBe('weekend-warrior')
    expect(result?.facts[0]).toBe('10 of your 10 runs (100%) were on a Saturday or Sunday.')
  })

  it('Data Goblin: splits and heart rate on almost everything', () => {
    const result = classifyRunner(
      log(10, {
        over: (i) => ({
          avgHeartRate: 150,
          splitsSecPerKm: [330, 331],
          notes: i < 3 ? 'felt good' : undefined,
          durationSec: 6 * (300 + i * 12),
        }),
      }),
    )
    expect(result?.type).toBe('data-goblin')
    expect(result?.facts[0]).toBe(
      '100% of your runs have km splits or heart rate, and 3 have notes.',
    )
  })

  it('picks the most distinctive type when several fit, and mentions the runner-up', () => {
    // Steady pace (Diesel) AND a long break (Comeback Kid): the comeback is more distinctive.
    const before = log(5, { start: '2026-08-01' })
    const after = log(5, { start: '2026-09-20' }).map((r) => ({ ...r, id: `b-${r.id}` }))
    const result = classifyRunner([...before, ...after])
    expect(result?.type).toBe('comeback-kid')
    expect(result?.facts[1]).toMatch(/^Also a bit of a Diesel: your pace barely changes/)
  })

  it('says "closest match" honestly when no rule is clearly met', () => {
    // Uneven pace, weekdays, no detail, no fast runs, no breaks.
    const result = classifyRunner(
      log(10, { over: (i) => ({ durationSec: 6 * (290 + (i % 5) * 20) }) }),
    )
    expect(result?.clearMatch).toBe(false)
    expect(result?.facts.at(-1)).toBe('10 runs logged, about 3.7 a week.')
  })
})

describe('runner features', () => {
  it('counts runs per week over the span of the log', () => {
    expect(runnerFeatures(log(8, { everyDays: 7 })).runsPerWeek).toBe(1.1) // 8 runs over 50 days
  })
})
