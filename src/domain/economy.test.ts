import { describe, expect, it } from 'vitest'
import { SAMPLE_PROFILE, sampleRun } from '../test/fixtures'
import { currentStreak, earningEvents, totals } from './economy'

// SAMPLE_PROFILE: experienced, runs Tue/Thu/Sat. Started Sat 21 Nov 2026.
// Its plan (build phase): Tue quality, Thu easy, Sat long; every other day is rest.
const profile = { ...SAMPLE_PROFILE, classChosenOn: '2026-11-16' } // start on a Monday

describe('earnings', () => {
  it('gives XP and coins per run (10 XP + 2 XP per km, 5 coins)', () => {
    const events = earningEvents(
      profile,
      [sampleRun({ date: '2026-11-17', distanceKm: 8 })],
      '2026-11-17',
    )
    expect(events.filter((e) => e.kind === 'run')).toEqual([
      expect.objectContaining({ xp: 26, coins: 5 }),
    ])
  })

  it('ignores runs from before you started (imported history earns nothing)', () => {
    const events = earningEvents(profile, [sampleRun({ date: '2026-10-01' })], '2026-11-17')
    expect(events.filter((e) => e.kind === 'run')).toEqual([])
  })

  it('credits planned rest days automatically once they are over and had no run', () => {
    // Mon 16 is a planned rest day and is over by Wed 18. Tue 17 is a run day. Wed 18 = today.
    const events = earningEvents(profile, [], '2026-11-18')
    expect(events.filter((e) => e.kind === 'rest-day').map((e) => e.date)).toEqual(['2026-11-16'])
  })

  it('does not credit a rest day you ran on', () => {
    const events = earningEvents(profile, [sampleRun({ date: '2026-11-16' })], '2026-11-18')
    expect(events.filter((e) => e.kind === 'rest-day')).toEqual([])
  })

  it('rewards complete weeks and growing streaks', () => {
    const week = (monday: string, days: string[]) =>
      days.map((d, i) => sampleRun({ id: `${monday}-${i}`, date: d }))
    const runs = [
      ...week('w1', ['2026-11-17', '2026-11-19', '2026-11-21']),
      ...week('w2', ['2026-11-24', '2026-11-26', '2026-11-28']),
      ...week('w3', ['2026-12-01', '2026-12-03', '2026-12-05']),
    ]
    const events = earningEvents(profile, runs, '2026-12-07')
    const weeks = events.filter((e) => e.kind === 'week-complete')
    expect(weeks.map((e) => [e.date, e.coins, e.label])).toEqual([
      ['2026-11-22', 10, 'Week complete'],
      ['2026-11-29', 15, 'Week complete (2-week streak)'],
      ['2026-12-06', 20, 'Week complete (3-week streak)'],
    ])
    expect(currentStreak(events, '2026-12-07')).toBe(3)
  })

  it('breaks the streak after an incomplete week (rest is fine, missing runs is not)', () => {
    const runs = [
      sampleRun({ id: 'a', date: '2026-11-17' }),
      sampleRun({ id: 'b', date: '2026-11-19' }),
      sampleRun({ id: 'c', date: '2026-11-21' }),
      sampleRun({ id: 'd', date: '2026-11-24' }), // only 1 of 3 in week 2
    ]
    const events = earningEvents(profile, runs, '2026-11-30')
    expect(events.filter((e) => e.kind === 'week-complete')).toHaveLength(1)
    expect(currentStreak(events, '2026-11-30')).toBe(0)
  })

  it('does not count the current, unfinished week', () => {
    const runs = ['2026-11-17', '2026-11-19', '2026-11-21'].map((date, i) =>
      sampleRun({ id: `r${i}`, date }),
    )
    expect(
      earningEvents(profile, runs, '2026-11-22').filter((e) => e.kind === 'week-complete'),
    ).toEqual([])
  })

  it('adds everything up', () => {
    const events = earningEvents(
      profile,
      [sampleRun({ date: '2026-11-17', distanceKm: 5 })],
      '2026-11-18',
    )
    // run: 10 + 10 XP, 5 coins. rest day Mon 16: 5 XP, 2 coins.
    expect(totals(events)).toEqual({ xp: 25, coins: 7 })
    expect(totals(events, '2026-11-16')).toEqual({ xp: 5, coins: 2 })
  })
})

describe('joining mid-week', () => {
  it('only expects the runs planned after you started', () => {
    // Started Sat 21 Nov: only Saturday's long run is planned in week 1.
    const late = { ...SAMPLE_PROFILE, classChosenOn: '2026-11-21' }
    const events = earningEvents(late, [sampleRun({ date: '2026-11-21' })], '2026-11-23')
    expect(events.filter((e) => e.kind === 'week-complete').map((e) => e.date)).toEqual([
      '2026-11-22',
    ])
  })
})
