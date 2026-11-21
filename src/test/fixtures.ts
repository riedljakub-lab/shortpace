import type { Profile, Run } from '../domain/types'

/** A complete, valid profile for tests. */
export const SAMPLE_PROFILE: Profile = {
  avatarId: 'look-3',
  distanceClass: '10k',
  classChosenOn: '2026-11-21',
  persona: 'trail-goat',
  sex: 'women',
  age: 34,
  hasInjury: false,
  runDays: ['tue', 'thu', 'sat'],
  longRunDay: 'sat',
  longestRunKm30d: 8,
  canRun30Min: true,
  ranRegularly3Months: true,
  baseline: { kind: 'race', distance: '5k', timeSec: 1650 },
  goalPaceSecPerKm: 315,
  createdAt: '2026-11-21T18:00:00.000Z',
}

/** A valid run for tests. Override fields as needed: sampleRun({ distanceKm: 12 }). */
export function sampleRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    date: '2026-11-20',
    distanceKm: 8,
    durationSec: 2640,
    type: 'easy',
    effort: 4,
    source: 'manual',
    createdAt: '2026-11-20T18:00:00.000Z',
    ...overrides,
  }
}
