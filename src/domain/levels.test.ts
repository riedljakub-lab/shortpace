import { describe, expect, it } from 'vitest'
import { INSEAM_LADDER } from '../config/levels'
import type { Profile, Run } from './types'
import { SAMPLE_PROFILE, sampleRun } from '../test/fixtures'
import { ageGradedPercent, ageGroup } from './ageGroup'
import { addDays } from './dates'
import { bestEstimate, progression, regressAt, rungFor, speedBarSec } from './levels'

// A 10K runner who started with a 5K race in 27:30 (→ ~57:20 for 10K).
const profile: Profile = {
  ...SAMPLE_PROFILE,
  classChosenOn: '2026-09-07',
  baseline: { kind: 'race', distance: '5k', timeSec: 1650 },
}

/** `count` runs, every other day, ending on `lastDate`. Pace in s/km. */
function series(lastDate: string, count: number, pace: number, over: Partial<Run> = {}): Run[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(lastDate, -2 * (count - 1 - i))
    return sampleRun({
      id: `${date}-${pace}-${i}`,
      date,
      distanceKm: 8,
      durationSec: 8 * pace,
      type: 'easy',
      effort: 5,
      ...over,
    })
  })
}

describe('inseam ladder', () => {
  it('has the 10 rungs from the brief', () => {
    expect(INSEAM_LADDER.map((r) => r.inseamCm)).toEqual([30, 25, 20, 18, 13, 12.5, 7.5, 5, 3, 2])
    expect(rungFor(1).name).toBe('Cargo shorts')
    expect(rungFor(10).name).toBe('Record Ghost micro splits')
    expect(rungFor(99).level).toBe(10)
  })
})

describe('progression', () => {
  it('starts everyone at level 1 (cargo shorts)', () => {
    const p = progression(profile, [], '2026-09-07')
    expect(p.level).toBe(1)
    expect(p.rung.inseamCm).toBe(30)
    expect(p.next?.rung.name).toBe('Basketball baggies')
  })

  it('reaches level 2 with XP, consistency and pace at least as good as the start', () => {
    // 8 km runs at 5:39/km → Riegel 10K ≈ 57:16, a touch (0.1%) faster than the 57:20 baseline.
    const runs = series('2026-10-04', 12, 339)
    const p = progression(profile, runs, '2026-10-04')
    expect(p.xp).toBeGreaterThanOrEqual(100)
    expect(p.level).toBeGreaterThanOrEqual(2)
  })

  it('needs to get faster for the higher levels, and explains what is missing', () => {
    const runs = series('2026-10-04', 12, 339) // only 0.1% faster
    const p = progression(profile, runs, '2026-10-04')
    expect(p.level).toBe(2)
    const faster = p.next?.requirements.find((r) => r.label === 'Faster than when you started')
    expect(faster).toMatchObject({ need: '1% faster', met: false })
  })

  it('climbs further when pace improves', () => {
    // Two months of running; the last month at 5:18/km ≈ 6.3% faster than the start.
    const runs = [...series('2026-10-31', 14, 335), ...series('2026-11-28', 14, 318)]
    const p = progression(profile, runs, '2026-11-28')
    expect(p.level).toBe(5)
    expect(p.next?.rung.name).toBe('5-inch')
  })

  it('keeps an earned level through a long break (breaks never count against you)', () => {
    const runs = series('2026-10-04', 12, 339)
    const later = progression(profile, runs, '2027-02-01') // 4 months without running
    expect(later.earnedLevel).toBe(2)
    expect(later.level).toBe(2)
    expect(later.regress).toBeNull()
  })
})

describe('regress', () => {
  it('drops one level and flags the pocket when easy runs are clearly slower', () => {
    const runs = [...series('2026-10-04', 12, 339), ...series('2026-11-01', 8, 359)]
    // previous 4 weeks 5:39, last 4 weeks 5:59 → 20 s/km slower
    const r = regressAt(runs, '2026-11-01')
    expect(r?.slowerSecPerKm).toBe(20)
    const p = progression(profile, runs, '2026-11-01')
    expect(p.earnedLevel).toBe(2)
    expect(p.level).toBe(1)
  })

  it('ignores small changes', () => {
    const runs = [...series('2026-10-04', 12, 339), ...series('2026-11-01', 8, 346)]
    expect(regressAt(runs, '2026-11-01')).toBeNull()
  })

  it('never counts breaks: too few easy runs means no verdict', () => {
    const runs = [...series('2026-10-04', 12, 345), ...series('2026-11-01', 2, 400)]
    expect(regressAt(runs, '2026-11-01')).toBeNull()
  })

  it('only compares easy runs (a slow long run or hard intervals are not regress)', () => {
    const runs = [
      ...series('2026-10-04', 12, 345),
      ...series('2026-11-01', 8, 420, { type: 'long' }),
      ...series('2026-10-31', 3, 345),
    ]
    expect(regressAt(runs, '2026-11-01')).toBeNull()
  })
})

describe('speed levels 7–10 (placeholder bars from the Czech records)', () => {
  it('uses record × multiplier, women’s record for women', () => {
    // Women's 10K record 31:05 = 1865 s
    expect(speedBarSec(10, profile)).toBe(1865)
    expect(speedBarSec(7, profile)).toBeCloseTo(1865 * 1.75)
  })

  it('uses the men’s record as the neutral default for "prefer not to say"', () => {
    expect(speedBarSec(10, { ...profile, sex: 'unspecified' })).toBe(28 * 60 + 19)
  })

  it('estimates race time from the best run (Riegel)', () => {
    const runs = [
      sampleRun({ distanceKm: 5, durationSec: 1500 }),
      sampleRun({ id: 'b', distanceKm: 1, durationSec: 200 }),
    ]
    // The 1 km run is too short to count; 25:00 5K → 52:07 10K.
    expect(Math.round(bestEstimate(runs, 10) ?? 0)).toBe(3127)
  })
})

describe('age group and age grading', () => {
  it('groups ages in 5-year bands from 35', () => {
    expect(ageGroup(29)).toBe('Under 35')
    expect(ageGroup(35)).toBe('35–39')
    expect(ageGroup(44)).toBe('40–44')
    expect(ageGroup(83)).toBe('70+')
  })

  it('has no age-graded score until a licensed table is plugged in', () => {
    expect(ageGradedPercent(1500, { sex: 'men', age: 40, distance: '5k' })).toBeNull()
    const fakeTable = { standardSec: () => 900 }
    expect(ageGradedPercent(1500, { sex: 'men', age: 40, distance: '5k' }, fakeTable)).toBe(60)
  })
})
