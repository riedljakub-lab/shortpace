import { describe, expect, it } from 'vitest'
import { isNovice, needsMarathonWarning } from './novice'
import { formatDuration } from './pace'
import { ambitionLevel, estimateRaceTime, realityCheck } from './realityCheck'
import { exponentFor, predictTime } from './riegel'

describe('Riegel prediction', () => {
  it('uses 1.06 up to the half marathon', () => {
    expect(exponentFor(5, 10)).toBe(1.06)
    expect(exponentFor(10, 21.0975)).toBe(1.06)
    expect(exponentFor(21.0975, 5)).toBe(1.06)
  })

  it('uses the stricter marathon exponent when the marathon is involved', () => {
    expect(exponentFor(5, 42.195)).toBe(1.15)
    expect(exponentFor(42.195, 10)).toBe(1.15)
  })

  it('predicts known textbook values from a 25:00 5K', () => {
    expect(formatDuration(predictTime(1500, 5, 10))).toBe('52:07')
    expect(formatDuration(predictTime(1500, 5, 21.0975))).toBe('1:55:00')
    expect(formatDuration(predictTime(1500, 5, 42.195))).toBe('4:50:31')
  })

  it('is consistent both ways', () => {
    const tenK = predictTime(1500, 5, 10)
    expect(predictTime(tenK, 10, 5)).toBeCloseTo(1500, 6)
  })

  it('refuses nonsense input', () => {
    expect(() => predictTime(0, 5, 10)).toThrow()
    expect(() => predictTime(1500, 0, 10)).toThrow()
  })
})

describe('estimateRaceTime', () => {
  it('returns null without a baseline', () => {
    expect(estimateRaceTime({ kind: 'unknown' }, 10)).toBeNull()
  })

  it('treats easy pace minus 75 s/km as 5K race pace', () => {
    // 6:30 easy → 5:15 race pace → 26:15 for 5K
    expect(estimateRaceTime({ kind: 'easyPace', secPerKm: 390 }, 5)).toBe(1575)
  })
})

describe('realityCheck', () => {
  const race25 = { kind: 'race', distance: '5k', timeSec: 1500 } as const

  it('flags a goal faster than the prediction as "beyond", with the gap', () => {
    // 25:00 5K predicts 52:07 for 10K (5:13/km). Goal 5:00/km is 13 s/km faster.
    const result = realityCheck({ baseline: race25, distanceClass: '10k', goalPaceSecPerKm: 300 })
    expect(result.status).toBe('beyond')
    if (result.status === 'no-baseline') throw new Error('unexpected')
    expect(result.gapSecPerKm).toBe(13)
    expect(result.gapPct).toBe(4.2)
    expect(formatDuration(result.goal.timeSec)).toBe('50:00')
  })

  it('calls a goal at or slower than the prediction "within reach"', () => {
    expect(
      realityCheck({ baseline: race25, distanceClass: '10k', goalPaceSecPerKm: 330 }).status,
    ).toBe('within-reach')
    expect(
      realityCheck({ baseline: race25, distanceClass: '5k', goalPaceSecPerKm: 300 }).status,
    ).toBe('within-reach')
  })

  it('cannot compare without a baseline, but still shows the goal time', () => {
    const result = realityCheck({
      baseline: { kind: 'unknown' },
      distanceClass: 'half',
      goalPaceSecPerKm: 360,
    })
    expect(result.status).toBe('no-baseline')
    expect(formatDuration(result.goal.timeSec)).toBe('2:06:35')
  })
})

describe('novice rule', () => {
  it('is a novice when either answer is no', () => {
    expect(isNovice({ canRun30Min: false, ranRegularly3Months: true })).toBe(true)
    expect(isNovice({ canRun30Min: true, ranRegularly3Months: false })).toBe(true)
    expect(isNovice({ canRun30Min: false, ranRegularly3Months: false })).toBe(true)
    expect(isNovice({ canRun30Min: true, ranRegularly3Months: true })).toBe(false)
  })

  it('warns only novices who pick the marathon', () => {
    const novice = { canRun30Min: false, ranRegularly3Months: true }
    const experienced = { canRun30Min: true, ranRegularly3Months: true }
    expect(needsMarathonWarning({ ...novice, distanceClass: 'marathon' })).toBe(true)
    expect(needsMarathonWarning({ ...novice, distanceClass: 'half' })).toBe(false)
    expect(needsMarathonWarning({ ...experienced, distanceClass: 'marathon' })).toBe(false)
  })
})

describe('ambitionLevel', () => {
  it('separates a stretch from a long-term goal at 10%', () => {
    expect(ambitionLevel(4.2)).toBe('stretch')
    expect(ambitionLevel(10)).toBe('stretch')
    expect(ambitionLevel(10.1)).toBe('long-term')
    expect(ambitionLevel(30.2)).toBe('long-term')
  })
})
