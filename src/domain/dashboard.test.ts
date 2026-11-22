import { describe, expect, it } from 'vitest'
import { SAMPLE_PROFILE, sampleRun } from '../test/fixtures'
import {
  gapByKm,
  gapByType,
  gapSummary,
  ghostGap,
  longestVsLimit,
  pacePoints,
  regressReasons,
  weeklyKm,
} from './dashboard'
import { addDays } from './dates'

const GOAL = 300 // 5:00 /km
/** 5 km run at the given pace (s/km). */
const at = (id: string, date: string, paceSec: number, over = {}) =>
  sampleRun({ id, date, distanceKm: 5, durationSec: 5 * paceSec, ...over })

describe('pace and gap to goal', () => {
  const runs = [at('b', '2026-11-03', 330), at('a', '2026-11-01', 320), at('c', '2026-11-05', 310)]

  it('lists runs oldest first with pace, gap and a rolling average', () => {
    expect(
      pacePoints(runs, GOAL).map((p) => [p.runId, p.paceSec, p.gapSec, p.rollingGapSec]),
    ).toEqual([
      ['a', 320, 20, 20],
      ['b', 330, 30, 25],
      ['c', 310, 10, 20],
    ])
  })

  it('keeps only the most recent runs', () => {
    expect(pacePoints(runs, GOAL, 2).map((p) => p.runId)).toEqual(['b', 'c'])
  })

  it('summarises the gap of the last 5 runs and the change vs the 5 before', () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      at(`r${i}`, addDays('2026-10-01', i), i < 5 ? 330 : 318),
    )
    expect(gapSummary(ten, GOAL)).toEqual({ currentSec: 18, changeSec: -12 }) // 12 s/km closer
    expect(gapSummary(runs, GOAL)).toEqual({ currentSec: 20, changeSec: null })
    expect(gapSummary([], GOAL)).toBeNull()
  })
})

describe('where you are missing', () => {
  it('averages the gap per run type, leaving out types you haven’t run', () => {
    const runs = [
      at('e1', '2026-11-01', 360, { type: 'easy' }),
      at('e2', '2026-11-02', 340, { type: 'easy' }),
      at('f1', '2026-11-03', 295, { type: 'fast' }),
    ]
    expect(gapByType(runs, GOAL)).toEqual([
      { type: 'easy', label: 'Easy', runs: 2, avgGapSec: 50 },
      { type: 'fast', label: 'Fast', runs: 1, avgGapSec: -5 },
    ])
  })

  it('averages the gap per kilometre from runs with splits', () => {
    const runs = [
      at('a', '2026-11-01', 300, { splitsSecPerKm: [295, 300, 320] }),
      at('b', '2026-11-02', 300, { splitsSecPerKm: [305, 310] }),
      at('c', '2026-11-03', 300), // no splits: ignored
    ]
    expect(gapByKm(runs, GOAL)).toEqual([
      { km: 1, label: 'km 1', runs: 2, avgGapSec: 0 },
      { km: 2, label: 'km 2', runs: 2, avgGapSec: 5 },
      { km: 3, label: 'km 3', runs: 1, avgGapSec: 20 },
    ])
    expect(gapByKm([at('x', '2026-11-01', 300)], GOAL)).toEqual([])
  })
})

describe('weekly km and longest run vs the spike limit', () => {
  const today = '2026-11-22' // Sunday; this week starts Mon 16 Nov
  const runs = [
    sampleRun({ id: 'a', date: '2026-11-03', distanceKm: 6 }),
    sampleRun({ id: 'b', date: '2026-11-05', distanceKm: 4.5 }),
    sampleRun({ id: 'c', date: '2026-11-18', distanceKm: 10 }), // big jump: 10 > 6 × 1.1
  ]

  it('adds up km per week, including empty weeks', () => {
    const weeks = weeklyKm(runs, today, 3)
    expect(weeks).toEqual([
      { weekStart: '2026-11-02', label: '2 Nov', km: 10.5 },
      { weekStart: '2026-11-09', label: '9 Nov', km: 0 },
      { weekStart: '2026-11-16', label: '16 Nov', km: 10 },
    ])
  })

  it('shows the longest run per week, the limit, and flags big jumps', () => {
    const weeks = longestVsLimit(null, runs, today, 3)
    expect(weeks[0]).toMatchObject({ longestKm: 6, limitKm: null, bigJump: false }) // fresh start
    expect(weeks[1]).toMatchObject({ longestKm: null, limitKm: 6.6 })
    expect(weeks[2]).toMatchObject({ longestKm: 10, limitKm: 6.6, bigJump: true })
  })
})

describe('Record Ghost gap', () => {
  it('shows where you’d be when the ghost finishes', () => {
    // Women's 10K record 31:05. A 5K in 25:00 → ~52:07 for 10K.
    const runs = [sampleRun({ date: '2026-11-20', distanceKm: 5, durationSec: 1500 })]
    const g = ghostGap(SAMPLE_PROFILE, runs, '2026-11-21')
    expect(g).toMatchObject({
      distanceLabel: '10K',
      ghostSec: 1865,
      yourKmAtGhostFinish: 6,
      behindKm: 4,
    })
  })

  it('falls back to the onboarding baseline, and has nothing without one', () => {
    expect(ghostGap(SAMPLE_PROFILE, [], '2026-11-21')).not.toBeNull()
    expect(
      ghostGap({ ...SAMPLE_PROFILE, baseline: { kind: 'unknown' } }, [], '2026-11-21'),
    ).toBeNull()
  })
})

describe('honest regress reasons', () => {
  const today = '2026-11-28'
  const easy = (id: string, date: string, effort: number, km = 5) =>
    sampleRun({ id, date, type: 'easy', effort, distanceKm: km })

  it('says "tired, not slower" when easy runs felt hard lately', () => {
    const runs = [
      ...[40, 37, 34, 31].map((d, i) => easy(`b${i}`, addDays(today, -d), 4)),
      ...[10, 7, 4, 1].map((d, i) => easy(`r${i}`, addDays(today, -d), 7)),
    ]
    expect(regressReasons(runs, today)).toContain('high-effort')
  })

  it('notices fewer runs', () => {
    const runs = [
      ...[50, 46, 42, 38, 34, 30].map((d, i) => easy(`b${i}`, addDays(today, -d), 4)),
      easy('r0', addDays(today, -5), 4),
    ]
    expect(regressReasons(runs, today)).toContain('fewer-runs')
  })

  it('admits when there is no clear pattern', () => {
    const runs = [40, 33, 26, 19, 12, 5].map((d, i) => easy(`r${i}`, addDays(today, -d), 4))
    expect(regressReasons(runs, today)).toEqual(['unclear'])
  })

  it('notices a jump in weekly km', () => {
    const runs = [
      ...[50, 43, 36, 29].map((d, i) => easy(`b${i}`, addDays(today, -d), 4, 5)),
      ...[12, 10, 8, 5, 3, 1].map((d, i) => easy(`r${i}`, addDays(today, -d), 4, 8)),
    ]
    expect(regressReasons(runs, today)).toContain('more-km')
  })
})
