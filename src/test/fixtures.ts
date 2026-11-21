import type { Profile } from '../domain/types'

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
