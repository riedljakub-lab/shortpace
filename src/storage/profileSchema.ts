// Checks that data read from storage really is a valid Profile.
// Anything else (old format, hand-edited, corrupted) is rejected instead of crashing the app.
import { AVATAR_IDS } from '../config/avatars'
import { DISTANCE_CLASS_IDS } from '../config/distances'
import { PERSONA_IDS } from '../config/personas'
import { isIsoDate, WEEKDAY_IDS } from '../domain/dates'
import { SEXES, type Baseline, type Profile } from '../domain/types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

function parseBaseline(v: unknown): Baseline | null {
  if (!isObj(v)) return null
  if (v.kind === 'unknown') return { kind: 'unknown' }
  if (v.kind === 'easyPace' && isNum(v.secPerKm)) return { kind: 'easyPace', secPerKm: v.secPerKm }
  if (v.kind === 'race' && isOneOf(DISTANCE_CLASS_IDS, v.distance) && isNum(v.timeSec)) {
    return { kind: 'race', distance: v.distance, timeSec: v.timeSec }
  }
  return null
}

export function parseProfile(v: unknown): Profile | null {
  if (!isObj(v)) return null
  const baseline = parseBaseline(v.baseline)
  const runDays = Array.isArray(v.runDays) ? v.runDays : null

  if (
    !isOneOf(AVATAR_IDS, v.avatarId) ||
    !isOneOf(DISTANCE_CLASS_IDS, v.distanceClass) ||
    !isIsoDate(v.classChosenOn) ||
    !isOneOf(PERSONA_IDS, v.persona) ||
    !isOneOf(SEXES, v.sex) ||
    !isNum(v.age) ||
    !isBool(v.hasInjury) ||
    !runDays?.every((d) => isOneOf(WEEKDAY_IDS, d)) ||
    !isOneOf(WEEKDAY_IDS, v.longRunDay) ||
    !isNum(v.longestRunKm30d) ||
    !isBool(v.canRun30Min) ||
    !isBool(v.ranRegularly3Months) ||
    !baseline ||
    !isNum(v.goalPaceSecPerKm) ||
    typeof v.createdAt !== 'string'
  ) {
    return null
  }

  return {
    avatarId: v.avatarId,
    distanceClass: v.distanceClass,
    classChosenOn: v.classChosenOn,
    persona: v.persona,
    sex: v.sex,
    age: v.age,
    hasInjury: v.hasInjury,
    runDays,
    longRunDay: v.longRunDay,
    longestRunKm30d: v.longestRunKm30d,
    canRun30Min: v.canRun30Min,
    ranRegularly3Months: v.ranRegularly3Months,
    baseline,
    goalPaceSecPerKm: v.goalPaceSecPerKm,
    createdAt: v.createdAt,
  }
}
