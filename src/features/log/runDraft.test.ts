import { describe, expect, it } from 'vitest'
import {
  draftToRun,
  emptyRunDraft,
  livePace,
  parseSplits,
  validateRunDraft,
  type RunDraft,
} from './runDraft'

const TODAY = '2026-11-21'
const GOOD: RunDraft = {
  ...emptyRunDraft(TODAY),
  date: '2026-11-20',
  distanceKm: '8,5',
  duration: '47:00',
  type: 'long',
  effort: '6',
}

describe('validateRunDraft', () => {
  it('accepts a minimal valid run', () => {
    expect(validateRunDraft(GOOD, TODAY)).toEqual({})
  })

  it('asks for distance, time and effort on an empty form', () => {
    const errors = validateRunDraft(emptyRunDraft(TODAY), TODAY)
    expect(Object.keys(errors).sort()).toEqual(['distanceKm', 'duration', 'effort'])
  })

  it('refuses future dates', () => {
    expect(validateRunDraft({ ...GOOD, date: '2026-11-22' }, TODAY).date).toMatch(/future/)
    expect(validateRunDraft({ ...GOOD, date: TODAY }, TODAY).date).toBeUndefined()
  })

  it('catches impossible paces as typos', () => {
    // 10 km in 10 minutes = 1:00/km
    expect(
      validateRunDraft({ ...GOOD, distanceKm: '10', duration: '10:00' }, TODAY).duration,
    ).toMatch(/1:00 \/km, faster than any world record/)
    // 1 km in 45 minutes = 45:00/km
    expect(
      validateRunDraft({ ...GOOD, distanceKm: '1', duration: '45:00' }, TODAY).duration,
    ).toMatch(/slower than walking/)
  })

  it('checks optional heart rate, notes and splits only when filled in', () => {
    expect(validateRunDraft({ ...GOOD, avgHeartRate: '150' }, TODAY)).toEqual({})
    expect(validateRunDraft({ ...GOOD, avgHeartRate: '15' }, TODAY).avgHeartRate).toBeDefined()
    expect(validateRunDraft({ ...GOOD, avgHeartRate: '150.5' }, TODAY).avgHeartRate).toBeDefined()
    expect(validateRunDraft({ ...GOOD, notes: 'x'.repeat(501) }, TODAY).notes).toBeDefined()
    expect(validateRunDraft({ ...GOOD, splits: '5:31, 5:28' }, TODAY)).toEqual({})
    expect(validateRunDraft({ ...GOOD, splits: '5:31, fast' }, TODAY).splits).toBeDefined()
  })

  it('allows a partial last km, but not more splits than km', () => {
    const nine = Array(9).fill('5:30').join(', ')
    const ten = Array(10).fill('5:30').join(', ')
    expect(validateRunDraft({ ...GOOD, splits: nine }, TODAY).splits).toBeUndefined() // 8.5 km → 9 ok
    expect(validateRunDraft({ ...GOOD, splits: ten }, TODAY).splits).toMatch(
      /10 splits for a 8.5 km/,
    )
  })
})

describe('parseSplits', () => {
  it('accepts commas, semicolons and spaces', () => {
    expect(parseSplits('5:31, 5:28;5:40 5:02')).toEqual([331, 328, 340, 302])
    expect(parseSplits('5:31, oops')).toBeNull()
  })
})

describe('livePace', () => {
  it('shows pace once distance and time make sense', () => {
    expect(livePace(GOOD)).toBeCloseTo(331.76, 1)
    expect(livePace({ ...GOOD, duration: '' })).toBeNull()
  })
})

describe('draftToRun', () => {
  const opts = { id: 'abc', now: new Date('2026-11-21T08:00:00Z'), today: TODAY }

  it('builds a clean run and leaves empty optional fields out', () => {
    expect(draftToRun(GOOD, opts)).toEqual({
      id: 'abc',
      date: '2026-11-20',
      distanceKm: 8.5,
      durationSec: 2820,
      type: 'long',
      effort: 6,
      source: 'manual',
      createdAt: '2026-11-21T08:00:00.000Z',
    })
  })

  it('keeps optional fields when filled in', () => {
    const run = draftToRun(
      { ...GOOD, avgHeartRate: ' 148 ', notes: ' Hilly ', splits: '5:31, 5:28' },
      opts,
    )
    expect(run).toMatchObject({ avgHeartRate: 148, notes: 'Hilly', splitsSecPerKm: [331, 328] })
  })

  it('refuses an invalid draft', () => {
    expect(() => draftToRun(emptyRunDraft(TODAY), opts)).toThrow()
  })
})
