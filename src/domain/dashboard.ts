// Data shaping for the dashboard charts. Pure functions: runs in, chart rows out.
import { distanceClass } from '../config/distances'
import { recordGhostTime } from '../config/records'
import { RUN_TYPES, type RunType } from '../config/runTypes'
import { addDays, daysBetween, formatShortDate, mondayOf } from './dates'
import { checkSpike } from './guard'
import { longestRecentKm } from './history'
import { baselineEstimate, bestEstimate } from './levels'
import { paceFromTime } from './pace'
import type { Profile, Run } from './types'

const pace = (r: Run) => paceFromTime(r.durationSec, r.distanceKm)
const oldestFirst = (runs: readonly Run[]) =>
  [...runs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
const avg = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null
/** Short date without the weekday: "20 Nov". */
const dayMonth = (iso: string) => formatShortDate(iso).split(' ').slice(1).join(' ')

export interface PacePoint {
  runId: string
  date: string
  label: string
  type: RunType
  paceSec: number
  /** Seconds per km slower than goal (negative = faster than goal). */
  gapSec: number
  /** Average gap of this run and the 4 before it (smooths out easy vs hard days). */
  rollingGapSec: number
}

/** One point per run, oldest first, the most recent `limit` runs. */
export function pacePoints(runs: readonly Run[], goalSecPerKm: number, limit = 30): PacePoint[] {
  const sorted = oldestFirst(runs)
  const gaps = sorted.map((r) => pace(r) - goalSecPerKm)
  return sorted
    .map((r, i) => {
      const window = gaps.slice(Math.max(0, i - 4), i + 1)
      return {
        runId: r.id,
        date: r.date,
        label: dayMonth(r.date),
        type: r.type,
        paceSec: Math.round(pace(r)),
        gapSec: Math.round(gaps[i] ?? 0),
        rollingGapSec: Math.round(avg(window) ?? 0),
      }
    })
    .slice(-limit)
}

export interface GapSummary {
  /** Average gap of your last 5 runs (s/km; positive = slower than goal). */
  currentSec: number
  /** Change vs the 5 runs before (negative = you got closer to goal). Null without enough runs. */
  changeSec: number | null
}

export function gapSummary(runs: readonly Run[], goalSecPerKm: number): GapSummary | null {
  const gaps = oldestFirst(runs).map((r) => pace(r) - goalSecPerKm)
  const last = avg(gaps.slice(-5))
  if (last === null) return null
  const before = gaps.length >= 10 ? avg(gaps.slice(-10, -5)) : null
  return {
    currentSec: Math.round(last),
    changeSec: before === null ? null : Math.round(last - before),
  }
}

export interface TypeGap {
  type: RunType
  label: string
  runs: number
  avgGapSec: number
}

/** Average gap to goal per run type, in the app's run-type order. Types you haven't run are left out. */
export function gapByType(runs: readonly Run[], goalSecPerKm: number): TypeGap[] {
  return RUN_TYPES.flatMap((t) => {
    const ofType = runs.filter((r) => r.type === t.id)
    const gap = avg(ofType.map((r) => pace(r) - goalSecPerKm))
    return gap === null
      ? []
      : [{ type: t.id, label: t.label, runs: ofType.length, avgGapSec: Math.round(gap) }]
  })
}

export interface KmGap {
  km: number
  label: string
  runs: number
  avgGapSec: number
}

/** Average gap per kilometre of the run (km 1, km 2, ...), from runs that have splits. */
export function gapByKm(runs: readonly Run[], goalSecPerKm: number): KmGap[] {
  const withSplits = runs.filter((r) => r.splitsSecPerKm?.length)
  const longest = Math.max(0, ...withSplits.map((r) => r.splitsSecPerKm?.length ?? 0))
  return Array.from({ length: longest }, (_, i) => {
    const splits = withSplits.flatMap((r) => {
      const s = r.splitsSecPerKm?.[i]
      return s === undefined ? [] : [s]
    })
    return {
      km: i + 1,
      label: `km ${i + 1}`,
      runs: splits.length,
      avgGapSec: Math.round((avg(splits) ?? goalSecPerKm) - goalSecPerKm),
    }
  })
}

export interface WeekKm {
  weekStart: string
  label: string
  km: number
}

/** Total km per week (Mon–Sun) for the last `weeks` weeks, including empty weeks. */
export function weeklyKm(runs: readonly Run[], today: string, weeks = 12): WeekKm[] {
  const thisMonday = mondayOf(today)
  return Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(thisMonday, -7 * (weeks - 1 - i))
    const weekEnd = addDays(weekStart, 6)
    const km = runs
      .filter((r) => r.date >= weekStart && r.date <= weekEnd)
      .reduce((sum, r) => sum + r.distanceKm, 0)
    return { weekStart, label: dayMonth(weekStart), km: Math.round(km * 10) / 10 }
  })
}

export interface WeekLongest {
  weekStart: string
  label: string
  /** Longest run that week, or null if you didn't run. */
  longestKm: number | null
  /** Spike limit at the start of the week (+10% on the previous 30 days). Null = fresh start. */
  limitKm: number | null
  /** At least one run that week was a big jump (checked on its own day). */
  bigJump: boolean
}

export function longestVsLimit(
  profile: Profile | null,
  runs: readonly Run[],
  today: string,
  weeks = 12,
): WeekLongest[] {
  return weeklyKm(runs, today, weeks).map(({ weekStart, label }) => {
    const inWeek = runs.filter((r) => r.date >= weekStart && r.date <= addDays(weekStart, 6))
    const recent = longestRecentKm({ profile, runs, onDate: weekStart })
    const bigJump = inWeek.some(
      (r) =>
        checkSpike(r.distanceKm, longestRecentKm({ profile, runs, onDate: r.date })).status ===
        'spike',
    )
    return {
      weekStart,
      label,
      longestKm: inWeek.length ? Math.max(...inWeek.map((r) => r.distanceKm)) : null,
      limitKm: recent > 0 ? Math.round(recent * 1.1 * 10) / 10 : null,
      bigJump,
    }
  })
}

export interface GhostGap {
  distanceLabel: string
  ghostSec: number
  yourSec: number
  /** Where you'd be when the ghost crosses the line. */
  yourKmAtGhostFinish: number
  behindKm: number
}

/**
 * The Record Ghost: when the national-record pace crosses the finish line, how far
 * along would you be at your current estimated pace? (Reference only, never a name.)
 */
export function ghostGap(profile: Profile, runs: readonly Run[], today: string): GhostGap | null {
  const cls = distanceClass(profile.distanceClass)
  const recent = runs.filter((r) => r.date >= addDays(today, -89) && r.date <= today)
  const yourSec = bestEstimate(recent, cls.km) ?? baselineEstimate(profile, runs)
  if (!yourSec) return null
  const ghostSec = recordGhostTime(profile.sex, profile.distanceClass)
  const yourKmAtGhostFinish = Math.min(cls.km, (cls.km * ghostSec) / yourSec)
  return {
    distanceLabel: cls.label,
    ghostSec,
    yourSec,
    yourKmAtGhostFinish: Math.round(yourKmAtGhostFinish * 10) / 10,
    behindKm: Math.round((cls.km - yourKmAtGhostFinish) * 10) / 10,
  }
}

export type RegressReason = 'high-effort' | 'fewer-runs' | 'more-km' | 'unclear'

/**
 * Likely reasons why easy runs got slower, so regress is shown honestly:
 * often you're tired, not slower. Looks at the last 2–4 weeks vs the 4 weeks before.
 */
export function regressReasons(runs: readonly Run[], today: string): RegressReason[] {
  const between = (from: number, to: number) =>
    runs.filter((r) => r.date >= addDays(today, -from) && r.date <= addDays(today, -to))
  const recent = between(27, 0)
  const before = between(55, 28)
  const reasons: RegressReason[] = []

  const recentEffort = avg(
    between(13, 0)
      .filter((r) => r.type === 'easy')
      .map((r) => r.effort),
  )
  const beforeEffort = avg(before.filter((r) => r.type === 'easy').map((r) => r.effort))
  if (
    recentEffort !== null &&
    (recentEffort >= 7 || (beforeEffort !== null && recentEffort >= beforeEffort + 1.5))
  ) {
    reasons.push('high-effort')
  }
  if (before.length >= 4 && recent.length < before.length * 0.7) reasons.push('fewer-runs')
  // Weekly km: last 2 weeks vs the weeks before. Only count weeks that have history,
  // so a short log doesn't make normal running look like "more than usual".
  const km = (list: Run[]) => list.reduce((sum, r) => sum + r.distanceKm, 0)
  const firstRun = oldestFirst(runs)[0]?.date
  const beforeStart = firstRun && firstRun > addDays(today, -55) ? firstRun : addDays(today, -55)
  const beforeWeeks = Math.min(
    4,
    Math.max(1, (daysBetween(beforeStart, addDays(today, -28)) + 1) / 7),
  )
  const recentWeekly = km(between(13, 0)) / 2
  const beforeWeekly = km(before) / beforeWeeks
  if (beforeWeekly > 0 && recentWeekly > beforeWeekly * 1.3) reasons.push('more-km')
  return reasons.length ? reasons : ['unclear']
}

export const REGRESS_REASON_TEXT: Record<RegressReason, string> = {
  'high-effort':
    'Your easy runs have felt hard lately. That usually means tired, not slower. A couple of truly easy days or an extra rest day often brings the pace back.',
  'fewer-runs':
    'You’ve run less often than before. Fitness dips a little after a quieter spell and comes back quickly with consistency.',
  'more-km':
    'You’ve run more kilometres than usual lately. Tired legs are slower legs for a while; that’s normal while your body adapts.',
  unclear:
    'No clear pattern in your log. Heat, sleep, stress or a cold can all slow easy runs for a few weeks.',
}
