import { describe, expect, it } from 'vitest'
import { sampleRun } from '../test/fixtures'
import { checkSpike, restDayAdvice, restDayMessage, spikeMessage } from './guard'

describe('spike guard (more than 10% over the longest run of the last 30 days)', () => {
  it('allows up to exactly +10%', () => {
    expect(checkSpike(11, 10).status).toBe('ok')
    expect(checkSpike(8.8, 8).status).toBe('ok') // floating point: 8 × 1.1 = 8.800000000000001
    expect(checkSpike(5, 10).status).toBe('ok')
  })

  it('warns above +10%', () => {
    expect(checkSpike(11.1, 10)).toMatchObject({ status: 'spike', overPct: 11, longestKm: 10 })
    expect(checkSpike(12, 8)).toMatchObject({ status: 'spike', overPct: 50 })
  })

  it('treats "no runs in 30 days" as a fresh start, not a spike', () => {
    expect(checkSpike(3, 0).status).toBe('fresh-start')
  })

  it('explains why, with numbers, and never blocks', () => {
    const draft = spikeMessage(12, checkSpike(12, 8), 'draft')
    expect(draft?.title).toBe('That’s a big jump.')
    expect(draft?.body).toContain(
      '12 km is 50% longer than your longest run in the last 30 days (8 km).',
    )
    expect(draft?.body).toContain('most common causes of running injuries')
    expect(draft?.body).toContain('Up to 8.8 km keeps you on the safe side. You can still save it.')
  })

  it('rounds the safe limit down so following it never trips the rule', () => {
    // 7.3 × 1.1 = 8.03 → advise 8 km, not 8.1
    expect(spikeMessage(9, checkSpike(9, 7.3), 'planned')?.body).toContain('stop at 8 km')
  })

  it('says nothing when the run is fine, and nothing about fresh starts in the plan', () => {
    expect(spikeMessage(5, checkSpike(5, 10), 'logged')).toBeNull()
    expect(spikeMessage(3, checkSpike(3, 0), 'planned')).toBeNull()
    expect(spikeMessage(3, checkSpike(3, 0), 'logged')?.tone).toBe('info')
  })
})

describe('effort rule (2 easy runs at 8+/10 within 7 days → rest day)', () => {
  const tough = (id: string, date: string) => sampleRun({ id, date, type: 'easy', effort: 8 })

  it('needs two tough easy runs', () => {
    expect(restDayAdvice([tough('a', '2026-11-20')], '2026-11-21')).toBeNull()
    expect(
      restDayAdvice([tough('a', '2026-11-18'), tough('b', '2026-11-20')], '2026-11-21'),
    ).toMatchObject({ restDay: 'today' })
  })

  it('only counts EASY runs (a hard race or long run at 9/10 is expected)', () => {
    const runs = [
      sampleRun({ id: 'a', date: '2026-11-19', type: 'race', effort: 10 }),
      sampleRun({ id: 'b', date: '2026-11-20', type: 'long', effort: 9 }),
      tough('c', '2026-11-21'),
    ]
    expect(restDayAdvice(runs, '2026-11-21')).toBeNull()
  })

  it('only looks at the last 7 days', () => {
    // 15th and 21st are 7 days inclusive → counts. 14th and 21st → 8 days → doesn't.
    expect(
      restDayAdvice([tough('a', '2026-11-15'), tough('b', '2026-11-21')], '2026-11-21'),
    ).not.toBeNull()
    expect(
      restDayAdvice([tough('a', '2026-11-14'), tough('b', '2026-11-21')], '2026-11-21'),
    ).toBeNull()
  })

  it('says "tomorrow" if you already ran today', () => {
    expect(
      restDayAdvice([tough('a', '2026-11-19'), tough('b', '2026-11-21')], '2026-11-21')?.restDay,
    ).toBe('tomorrow')
  })

  it('goes away once a rest day has been taken', () => {
    // Tough runs on 17th and 18th, nothing on 19th (rest!), easy run on 20th.
    const runs = [
      tough('a', '2026-11-17'),
      tough('b', '2026-11-18'),
      sampleRun({ id: 'c', date: '2026-11-20', effort: 4 }),
    ]
    expect(restDayAdvice(runs, '2026-11-21')).toBeNull()
  })

  it('stays while you keep running without a break', () => {
    const runs = [
      tough('a', '2026-11-18'),
      tough('b', '2026-11-19'),
      sampleRun({ id: 'c', date: '2026-11-20', effort: 5 }),
    ]
    expect(restDayAdvice(runs, '2026-11-21')?.restDay).toBe('today')
  })

  it('explains why in the message', () => {
    const advice = restDayAdvice([tough('a', '2026-11-18'), tough('b', '2026-11-20')], '2026-11-21')
    if (!advice) throw new Error('expected advice')
    const msg = restDayMessage(advice)
    expect(msg.title).toBe('Time for a rest day.')
    expect(msg.body).toContain('2 of your easy runs this week felt like 8/10 or harder (Wed, Fri)')
    expect(msg.body).toContain('Take today off. Rest days earn XP too.')
  })
})
