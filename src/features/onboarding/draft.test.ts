import { describe, expect, it } from 'vitest'
import {
  draftToProfile,
  INITIAL_DRAFT,
  isComplete,
  parseKm,
  STEP_IDS,
  validateStep,
  type OnboardingDraft,
} from './draft'

const COMPLETE: OnboardingDraft = {
  avatarId: 'look-2',
  distanceClass: 'half',
  persona: 'weekend-warrior',
  sex: 'unspecified',
  age: '41',
  hasInjury: false,
  runDays: ['sat', 'tue', 'thu'],
  longRunDay: 'sat',
  longRunDayPicked: true,
  longestRunKm: '12,5',
  canRun30Min: true,
  ranRegularly3Months: true,
  baselineKind: 'race',
  raceDistance: '10k',
  raceTime: '52:30',
  easyPace: '',
  goalPace: '5:20',
}

describe('validateStep', () => {
  it('blocks every question step of an empty draft', () => {
    for (const step of STEP_IDS.filter((id) => id !== 'check')) {
      expect(Object.keys(validateStep(step, INITIAL_DRAFT)).length, step).toBeGreaterThan(0)
    }
  })

  it('never blocks on the reality check (it only informs)', () => {
    expect(validateStep('check', INITIAL_DRAFT)).toEqual({})
  })

  it('passes every step of a complete draft', () => {
    for (const step of STEP_IDS) expect(validateStep(step, COMPLETE), step).toEqual({})
    expect(isComplete(COMPLETE)).toBe(true)
  })

  it('checks age limits', () => {
    for (const age of ['13', '100', 'abc', '30.5', '']) {
      expect(validateStep('about', { ...COMPLETE, age }).age, age).toBeDefined()
    }
    expect(validateStep('about', { ...COMPLETE, age: '14' }).age).toBeUndefined()
  })

  it('needs at least 2 run days and a long-run day among them', () => {
    expect(validateStep('schedule', { ...COMPLETE, runDays: ['sat'] }).runDays).toBeDefined()
    expect(
      validateStep('schedule', { ...COMPLETE, runDays: ['mon', 'wed'], longRunDay: 'sat' })
        .longRunDay,
    ).toBeDefined()
  })

  it('only asks for the baseline detail that was chosen', () => {
    expect(validateStep('fitness', { ...COMPLETE, raceTime: 'soon' }).raceTime).toBeDefined()
    const easy = { ...COMPLETE, baselineKind: 'easyPace' as const, raceTime: '' }
    expect(validateStep('fitness', { ...easy, easyPace: '6:45' })).toEqual({})
    expect(validateStep('fitness', { ...easy, easyPace: '645' }).easyPace).toBeDefined()
    expect(validateStep('fitness', { ...COMPLETE, baselineKind: 'unknown', raceTime: '' })).toEqual(
      {},
    )
  })

  it('catches impossible goal paces as typos', () => {
    expect(validateStep('goal', { ...COMPLETE, goalPace: '1:59' }).goalPace).toBeDefined()
    expect(validateStep('goal', { ...COMPLETE, goalPace: '15:01' }).goalPace).toBeDefined()
    expect(validateStep('goal', { ...COMPLETE, goalPace: '2:50' }).goalPace).toBeUndefined()
  })

  it('accepts 0 km for "haven\'t run yet"', () => {
    expect(validateStep('fitness', { ...COMPLETE, longestRunKm: '0' }).longestRunKm).toBeUndefined()
  })
})

describe('parseKm', () => {
  it('reads dot or comma decimals', () => {
    expect(parseKm('7.5')).toBe(7.5)
    expect(parseKm('7,5')).toBe(7.5)
    expect(parseKm(' 10 ')).toBe(10)
    expect(parseKm('-3')).toBeNull()
    expect(parseKm('ten')).toBeNull()
  })
})

describe('draftToProfile', () => {
  const now = new Date(2026, 10, 21, 9, 30)

  it('converts text answers into a clean profile', () => {
    expect(draftToProfile(COMPLETE, now)).toEqual({
      avatarId: 'look-2',
      distanceClass: 'half',
      classChosenOn: '2026-11-21',
      persona: 'weekend-warrior',
      sex: 'unspecified',
      age: 41,
      hasInjury: false,
      runDays: ['tue', 'thu', 'sat'],
      longRunDay: 'sat',
      longestRunKm30d: 12.5,
      canRun30Min: true,
      ranRegularly3Months: true,
      baseline: { kind: 'race', distance: '10k', timeSec: 3150 },
      goalPaceSecPerKm: 320,
      createdAt: now.toISOString(),
    })
  })

  it('stores the easy-pace and unknown baselines', () => {
    expect(
      draftToProfile({ ...COMPLETE, baselineKind: 'easyPace', easyPace: '6:45' }, now).baseline,
    ).toEqual({ kind: 'easyPace', secPerKm: 405 })
    expect(draftToProfile({ ...COMPLETE, baselineKind: 'unknown' }, now).baseline).toEqual({
      kind: 'unknown',
    })
  })

  it('refuses an incomplete draft', () => {
    expect(() => draftToProfile(INITIAL_DRAFT, now)).toThrow()
  })
})
