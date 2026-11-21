// Onboarding answers while the user is still filling them in, plus validation per step.
// Text inputs stay as strings here; they become numbers only in draftToProfile().
import type { AvatarId } from '../../config/avatars'
import type { DistanceClassId } from '../../config/distances'
import type { PersonaId } from '../../config/personas'
import { PROFILE_LIMITS } from '../../config/profileRules'
import { sortWeekdays, todayIso, type Weekday } from '../../domain/dates'
import { formatPace, parseDuration, parsePace } from '../../domain/pace'
import type { Baseline, Profile, Sex } from '../../domain/types'

export const STEP_IDS = [
  'avatar',
  'class',
  'persona',
  'about',
  'schedule',
  'fitness',
  'goal',
] as const
export type StepId = (typeof STEP_IDS)[number]

export type BaselineKind = Baseline['kind']

export interface OnboardingDraft {
  avatarId: AvatarId | null
  distanceClass: DistanceClassId | null
  persona: PersonaId | null
  sex: Sex | null
  age: string
  hasInjury: boolean | null
  runDays: Weekday[]
  longRunDay: Weekday | null
  /** True once the user picks the long-run day themselves; until then we keep suggesting one. */
  longRunDayPicked: boolean
  longestRunKm: string
  canRun30Min: boolean | null
  ranRegularly3Months: boolean | null
  baselineKind: BaselineKind | null
  raceDistance: DistanceClassId
  raceTime: string
  easyPace: string
  goalPace: string
}

export type DraftErrors = Partial<Record<keyof OnboardingDraft, string>>

export const INITIAL_DRAFT: OnboardingDraft = {
  avatarId: null,
  distanceClass: null,
  persona: null,
  sex: null,
  age: '',
  hasInjury: null,
  runDays: [],
  longRunDay: null,
  longRunDayPicked: false,
  longestRunKm: '',
  canRun30Min: null,
  ranRegularly3Months: null,
  baselineKind: null,
  raceDistance: '5k',
  raceTime: '',
  easyPace: '',
  goalPace: '',
}

const L = PROFILE_LIMITS
const PACE_RANGE = `between ${formatPace(L.fastestPaceSecPerKm)} and ${formatPace(L.slowestPaceSecPerKm)}`

/** "8", "8.5" or "8,5" → number. Anything else → null. */
export function parseKm(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  return /^\d{1,3}(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null
}

function parseAge(text: string): number | null {
  return /^\d{1,3}$/.test(text.trim()) ? Number(text.trim()) : null
}

function paceError(text: string, what: string): string | undefined {
  const pace = parsePace(text)
  if (pace === null) return `Enter ${what} as minutes:seconds, like 6:15.`
  if (pace < L.fastestPaceSecPerKm || pace > L.slowestPaceSecPerKm) {
    return `That looks like a typo. Enter a pace ${PACE_RANGE} per km.`
  }
  return undefined
}

/** Returns an error message per field that blocks the step. Empty object = good to go. */
export function validateStep(step: StepId, d: OnboardingDraft): DraftErrors {
  const e: DraftErrors = {}
  switch (step) {
    case 'avatar':
      if (!d.avatarId) e.avatarId = 'Pick a look to continue.'
      break
    case 'class':
      if (!d.distanceClass) e.distanceClass = 'Pick a distance to continue.'
      break
    case 'persona':
      if (!d.persona) e.persona = 'Pick a persona to continue.'
      break
    case 'about': {
      if (!d.sex) e.sex = 'Choose one (or "Prefer not to say").'
      const age = parseAge(d.age)
      if (age === null || age < L.minAge || age > L.maxAge) {
        e.age = `Enter your age as a whole number from ${L.minAge} to ${L.maxAge}.`
      }
      if (d.hasInjury === null) e.hasInjury = 'Choose yes or no.'
      break
    }
    case 'schedule':
      if (d.runDays.length < L.minRunDays) {
        e.runDays = `Pick at least ${L.minRunDays} days. One will be your long run.`
      }
      if (!d.longRunDay || !d.runDays.includes(d.longRunDay)) {
        e.longRunDay = 'Pick your long-run day from the days you chose.'
      }
      break
    case 'fitness': {
      const km = parseKm(d.longestRunKm)
      if (km === null || km > L.maxLongestRunKm) {
        e.longestRunKm = 'Enter a distance in km, like 5 or 7.5. Enter 0 if you haven’t run.'
      }
      if (d.canRun30Min === null) e.canRun30Min = 'Choose yes or no.'
      if (d.ranRegularly3Months === null) e.ranRegularly3Months = 'Choose yes or no.'
      if (!d.baselineKind) e.baselineKind = 'Choose one. "I don’t know" is fine.'
      if (d.baselineKind === 'race' && parseDuration(d.raceTime) === null) {
        e.raceTime = 'Enter the time as mm:ss or h:mm:ss, like 27:40 or 1:02:10.'
      }
      if (d.baselineKind === 'easyPace') {
        const err = paceError(d.easyPace, 'your easy pace')
        if (err) e.easyPace = err
      }
      break
    }
    case 'goal': {
      const err = paceError(d.goalPace, 'your goal pace')
      if (err) e.goalPace = err
      break
    }
  }
  return e
}

/** True when every step passes. */
export function isComplete(d: OnboardingDraft): boolean {
  return STEP_IDS.every((step) => Object.keys(validateStep(step, d)).length === 0)
}

/** Turns a fully valid draft into the Profile we save. Throws if a step is still invalid. */
export function draftToProfile(d: OnboardingDraft, now: Date = new Date()): Profile {
  const age = parseAge(d.age)
  const km = parseKm(d.longestRunKm)
  const goal = parsePace(d.goalPace)
  if (
    !isComplete(d) ||
    !d.avatarId ||
    !d.distanceClass ||
    !d.persona ||
    !d.sex ||
    age === null ||
    d.hasInjury === null ||
    !d.longRunDay ||
    km === null ||
    d.canRun30Min === null ||
    d.ranRegularly3Months === null ||
    goal === null
  ) {
    throw new Error('Onboarding is not complete')
  }

  let baseline: Baseline = { kind: 'unknown' }
  if (d.baselineKind === 'race') {
    baseline = { kind: 'race', distance: d.raceDistance, timeSec: parseDuration(d.raceTime) ?? 0 }
  } else if (d.baselineKind === 'easyPace') {
    baseline = { kind: 'easyPace', secPerKm: parsePace(d.easyPace) ?? 0 }
  }

  return {
    avatarId: d.avatarId,
    distanceClass: d.distanceClass,
    classChosenOn: todayIso(now),
    persona: d.persona,
    sex: d.sex,
    age,
    hasInjury: d.hasInjury,
    runDays: sortWeekdays(d.runDays),
    longRunDay: d.longRunDay,
    longestRunKm30d: km,
    canRun30Min: d.canRun30Min,
    ranRegularly3Months: d.ranRegularly3Months,
    baseline,
    goalPaceSecPerKm: goal,
    createdAt: now.toISOString(),
  }
}
