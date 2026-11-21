// DRAFT weekly training plan generator. All numbers come from config/planRules.ts.
import { persona } from '../config/personas'
import {
  PLAN_RULES as R,
  QUALITY_ORDER,
  QUALITY_SESSIONS,
  SESSION_COPY,
  type QualityKind,
} from '../config/planRules'
import { addDays, mondayOf, sortWeekdays, WEEKDAY_IDS, type Weekday } from './dates'
import { isNovice } from './novice'
import type { Profile } from './types'

export type SessionKind = 'easy' | 'long' | 'quality' | 'strength' | 'rest'

export interface PlannedSession {
  kind: SessionKind
  title: string
  detail: string
  /** Long and quality sessions are hard; two hard days are never next to each other. */
  hard: boolean
  targetKm?: number
  targetMin?: number
  qualityKind?: QualityKind
}

export interface DayPlan {
  day: Weekday
  date: string
  session: PlannedSession
}

export interface WeekPlan {
  /** 1 = the week the runner started. */
  weekNumber: number
  phase: 'base' | 'build'
  startDate: string
  days: DayPlan[]
}

type PlanProfile = Pick<
  Profile,
  | 'distanceClass'
  | 'persona'
  | 'runDays'
  | 'longRunDay'
  | 'canRun30Min'
  | 'ranRegularly3Months'
  | 'classChosenOn'
>

const HARD = new Set<SessionKind>(R.hardSessions)
const index = (d: Weekday) => WEEKDAY_IDS.indexOf(d)

/** Days apart on a repeating week: Sunday and Monday are 1 apart. */
export function cyclicDistance(a: Weekday, b: Weekday): number {
  const diff = Math.abs(index(a) - index(b))
  return Math.min(diff, 7 - diff)
}

const minDistanceTo = (day: Weekday, others: readonly Weekday[]) =>
  Math.min(7, ...others.map((o) => cyclicDistance(day, o)))

/** Week 1 is the week (Mon–Sun) the class was chosen. */
export function planWeekNumber(classChosenOn: string, weekStart: string): number {
  const start = mondayOf(classChosenOn)
  const weeks = Math.round(
    (Date.parse(`${mondayOf(weekStart)}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      (7 * 86_400_000),
  )
  return Math.max(1, weeks + 1)
}

export function baseWeeksFor(p: PlanProfile): number {
  if (!isNovice(p)) return R.baseWeeks.experienced
  const extra = persona(p.persona).planFlavor === 'novice-start' ? R.extraBaseWeeksNoviceStart : 0
  return R.baseWeeks.novice + extra
}

/** Keeps the long-run day, then adds days that sit as far as possible from the ones chosen. */
export function chooseRunDays(available: Weekday[], longRunDay: Weekday, count: number): Weekday[] {
  const chosen: Weekday[] = [longRunDay]
  const pool = sortWeekdays(available).filter((d) => d !== longRunDay)
  while (chosen.length < count && pool.length > 0) {
    // Farthest from the days already chosen; ties go to the earlier day.
    pool.sort((a, b) => minDistanceTo(b, chosen) - minDistanceTo(a, chosen) || index(a) - index(b))
    const next = pool.shift()
    if (next) chosen.push(next)
  }
  return sortWeekdays(chosen)
}

function qualityCount(novice: boolean, runs: number): number {
  if (novice) return R.qualityPerWeek.novice
  return runs >= 4 ? R.qualityPerWeek.experienced4PlusRuns : R.qualityPerWeek.experiencedUpTo3Runs
}

/** Long run target: at most +10% on the recent longest run, rounded down to 0.5 km. */
export function longRunTargetKm(p: PlanProfile, longestRecentKm: number): number {
  const grown = Math.floor(longestRecentKm * (1 + R.longRunGrowth) * 2) / 2
  return Math.min(R.longRunCapKm[p.distanceClass], Math.max(R.minLongRunKm, grown))
}

export function generateWeekPlan(input: {
  profile: PlanProfile
  /** Any date in the week; the plan covers its Monday → Sunday. */
  weekOf: string
  longestRecentKm: number
}): WeekPlan {
  const p = input.profile
  const novice = isNovice(p)
  const flavor = persona(p.persona).planFlavor
  const startDate = mondayOf(input.weekOf)
  const weekNumber = planWeekNumber(p.classChosenOn, startDate)
  const phase = weekNumber <= baseWeeksFor(p) ? 'base' : 'build'
  const runWalk = novice && !p.canRun30Min && phase === 'base'

  // 1. Which days are run days.
  const maxRuns = novice ? R.maxRunsPerWeek.novice : R.maxRunsPerWeek.experienced
  const runDays = chooseRunDays(p.runDays, p.longRunDay, Math.min(p.runDays.length, maxRuns))

  // 2. Long run, then quality sessions never next to another hard day.
  const kinds = new Map<Weekday, SessionKind>([[p.longRunDay, 'long']])
  const wantedQuality = phase === 'base' ? 0 : qualityCount(novice, runDays.length)
  const qualityDays: Weekday[] = []
  const hardDays = () => [...kinds].filter(([, k]) => HARD.has(k)).map(([d]) => d)
  while (qualityDays.length < wantedQuality) {
    const candidates = runDays
      .filter((d) => !kinds.has(d) && minDistanceTo(d, hardDays()) >= 2)
      .sort(
        (a, b) =>
          minDistanceTo(b, hardDays()) - minDistanceTo(a, hardDays()) || index(a) - index(b),
      )
    const next = candidates[0]
    if (!next) break // not enough space: fewer quality sessions, never back-to-back hard days
    kinds.set(next, 'quality')
    qualityDays.push(next)
  }
  for (const d of runDays) if (!kinds.has(d)) kinds.set(d, 'easy')

  // 3. Strength days (Gym Girlie) on non-run days, keeping at least one full rest day.
  if (flavor === 'strength-days') {
    const free = WEEKDAY_IDS.filter((d) => !kinds.has(d))
    const wanted = novice ? R.strengthDaysPerWeek.novice : R.strengthDaysPerWeek.experienced
    const count = Math.max(0, Math.min(wanted, free.length - R.minRestDays))
    free
      .sort(
        (a, b) =>
          minDistanceTo(b, hardDays()) - minDistanceTo(a, hardDays()) || index(a) - index(b),
      )
      .slice(0, count)
      .forEach((d) => kinds.set(d, 'strength'))
  }

  // 4. Turn kinds into sessions with targets.
  const qualityOrder = QUALITY_ORDER[flavor] ?? QUALITY_ORDER.default ?? ['tempo']
  const easyMin = novice ? R.easyMinutes.novice : R.easyMinutes.experienced[p.distanceClass]
  const longKm = longRunTargetKm(p, input.longestRecentKm)

  const days: DayPlan[] = WEEKDAY_IDS.map((day, i) => {
    const kind = kinds.get(day) ?? 'rest'
    const date = addDays(startDate, i)
    let session: PlannedSession
    switch (kind) {
      case 'long':
        session = {
          kind,
          ...SESSION_COPY.long,
          detail: runWalk
            ? `${SESSION_COPY.long.detail} Run/walk is fine.`
            : SESSION_COPY.long.detail,
          hard: true,
          targetKm: longKm,
        }
        break
      case 'quality': {
        const qk = qualityOrder[qualityDays.indexOf(day) % qualityOrder.length] ?? 'tempo'
        session = { kind, ...QUALITY_SESSIONS[qk], hard: true, qualityKind: qk }
        break
      }
      case 'easy':
        session = {
          kind,
          ...(runWalk ? SESSION_COPY.runWalk : SESSION_COPY.easy),
          hard: false,
          targetMin: easyMin,
        }
        break
      case 'strength':
        session = { kind, ...SESSION_COPY.strength, hard: false, targetMin: 30 }
        break
      case 'rest':
        session = { kind, ...SESSION_COPY.rest, hard: false }
        break
    }
    return { day, date, session }
  })

  return { weekNumber, phase, startDate, days }
}
