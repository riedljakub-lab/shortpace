// Inseam level: which shorts you've earned. All rules come from config/levels.ts.
import { distanceClass } from '../config/distances'
import {
  CONSISTENCY_LEVELS,
  INSEAM_LADDER,
  MAX_LEVEL,
  MIN_ESTIMATE_DISTANCE_KM,
  PERCENTILE_LEVELS,
  PROGRESS_WINDOW_DAYS,
  REGRESS,
  SPEED_WINDOW_DAYS,
  type Rung,
} from '../config/levels'
import { ghostCategory, recordGhostTime } from '../config/records'
import { ageGroup } from './ageGroup'
import { addDays } from './dates'
import { earningEvents, totals, type EarningEvent } from './economy'
import { formatDuration, formatPace, paceFromTime } from './pace'
import { estimateRaceTime } from './realityCheck'
import { predictTime } from './riegel'
import type { Profile, Run } from './types'

export interface Requirement {
  label: string
  have: string
  need: string
  met: boolean
}

export interface Regress {
  /** How much slower your easy runs are than the 4 weeks before. */
  slowerSecPerKm: number
  previousEasyPace: number
  currentEasyPace: number
}

export interface Progression {
  /** What your shorts show now (earned level, minus one while regressing). */
  level: number
  /** Highest level ever reached. Never goes down. */
  earnedLevel: number
  rung: Rung
  regress: Regress | null
  xp: number
  coins: number
  events: EarningEvent[]
  /** What the next level needs, or null at the top. */
  next: { rung: Rung; requirements: Requirement[] } | null
}

export function rungFor(level: number): Rung {
  return INSEAM_LADDER[Math.min(MAX_LEVEL, Math.max(1, level)) - 1] ?? INSEAM_LADDER[0]
}

const between = (runs: readonly Run[], from: string, to: string) =>
  runs.filter((r) => r.date >= from && r.date <= to)

/** Best race-time estimate for `km` from a set of runs (Riegel from each run). */
export function bestEstimate(runs: readonly Run[], km: number): number | null {
  const estimates = runs
    .filter((r) => r.distanceKm >= MIN_ESTIMATE_DISTANCE_KM)
    .map((r) => predictTime(r.durationSec, r.distanceKm, km))
  return estimates.length ? Math.min(...estimates) : null
}

/** Where you started: your onboarding answer, or else your first 4 weeks of runs. */
export function baselineEstimate(profile: Profile, runs: readonly Run[]): number | null {
  const km = distanceClass(profile.distanceClass).km
  const fromOnboarding = estimateRaceTime(profile.baseline, km)
  if (fromOnboarding) return fromOnboarding
  const first = [...runs].sort((a, b) => a.date.localeCompare(b.date))[0]
  if (!first) return null
  return bestEstimate(between(runs, first.date, addDays(first.date, PROGRESS_WINDOW_DAYS - 1)), km)
}

/** Time bar for levels 7–10. PLACEHOLDER: record × multiplier until real percentiles exist. */
export function speedBarSec(level: 7 | 8 | 9 | 10, profile: Profile): number {
  const record = recordGhostTime(profile.sex, profile.distanceClass)
  return level === 10 ? record : record * PERCENTILE_LEVELS[level].recordMultiplier
}

interface Snapshot {
  xp: number
  runs28: number
  fasterPct: number | null
  best90: number | null
}

function snapshotAt(
  date: string,
  profile: Profile,
  runs: readonly Run[],
  events: EarningEvent[],
  baseline: number | null,
): Snapshot {
  const km = distanceClass(profile.distanceClass).km
  const recent = between(runs, addDays(date, -(PROGRESS_WINDOW_DAYS - 1)), date)
  const current = bestEstimate(recent, km)
  return {
    xp: totals(events, date).xp,
    runs28: recent.length,
    fasterPct: baseline && current ? ((baseline - current) / baseline) * 100 : null,
    best90: bestEstimate(between(runs, addDays(date, -(SPEED_WINDOW_DAYS - 1)), date), km),
  }
}

function levelFrom(s: Snapshot, profile: Profile): number {
  let level = 1
  for (const L of [2, 3, 4, 5, 6] as const) {
    const req = CONSISTENCY_LEVELS[L]
    const ok =
      s.xp >= req.xp &&
      s.runs28 >= req.runs28 &&
      s.fasterPct !== null &&
      s.fasterPct >= req.fasterPct - 1e-9
    if (!ok) return level
    level = L
  }
  for (const L of [7, 8, 9, 10] as const) {
    if (s.best90 === null || s.best90 > speedBarSec(L, profile)) return level
    level = L
  }
  return level
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? (sorted[mid] ?? 0) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/** Easy runs clearly slower than the 4 weeks before → regress. Breaks (too few runs) never count. */
export function regressAt(runs: readonly Run[], today: string): Regress | null {
  const easyPaces = (from: string, to: string) =>
    between(runs, from, to)
      .filter((r) => r.type === 'easy')
      .map((r) => paceFromTime(r.durationSec, r.distanceKm))
  const w = REGRESS.windowDays
  const current = easyPaces(addDays(today, -(w - 1)), today)
  const previous = easyPaces(addDays(today, -(2 * w - 1)), addDays(today, -w))
  if (current.length < REGRESS.minEasyRuns || previous.length < REGRESS.minEasyRuns) return null
  const currentEasyPace = median(current)
  const previousEasyPace = median(previous)
  const slowerSecPerKm = Math.round(currentEasyPace - previousEasyPace)
  return slowerSecPerKm > REGRESS.slowerBySecPerKm
    ? { slowerSecPerKm, previousEasyPace, currentEasyPace }
    : null
}

function requirementsFor(level: number, s: Snapshot, profile: Profile): Requirement[] {
  if (level >= 2 && level <= 6) {
    const req = CONSISTENCY_LEVELS[level as 2 | 3 | 4 | 5 | 6]
    return [
      { label: 'XP earned', have: String(s.xp), need: String(req.xp), met: s.xp >= req.xp },
      {
        label: 'Runs in the last 4 weeks',
        have: String(s.runs28),
        need: String(req.runs28),
        met: s.runs28 >= req.runs28,
      },
      {
        label: 'Faster than when you started',
        have: s.fasterPct === null ? 'not enough runs yet' : `${s.fasterPct.toFixed(1)}%`,
        need: req.fasterPct === 0 ? 'at least as fast' : `${req.fasterPct}% faster`,
        met: s.fasterPct !== null && s.fasterPct >= req.fasterPct - 1e-9,
      },
    ]
  }
  const L = level as 7 | 8 | 9 | 10
  const cls = distanceClass(profile.distanceClass).label
  const who = profile.sex === 'unspecified' ? 'men (neutral default)' : ghostCategory(profile.sex)
  const label =
    L === 10
      ? `Record Ghost pace for the ${cls}`
      : `Top ${PERCENTILE_LEVELS[L].topPct}% ${cls} time, ${who} ${ageGroup(profile.age)} (placeholder bar)`
  const bar = speedBarSec(L, profile)
  return [
    {
      label,
      have: s.best90 === null ? 'no estimate yet' : formatDuration(s.best90),
      need: `${formatDuration(bar)} or faster`,
      met: s.best90 !== null && s.best90 <= bar,
    },
  ]
}

export function progression(profile: Profile, runs: readonly Run[], today: string): Progression {
  const events = earningEvents(profile, runs, today)
  const { xp, coins } = totals(events)
  const baseline = baselineEstimate(profile, runs)

  // Levels are kept once earned: check every day something happened, keep the best.
  const checkpoints = new Set([...runs.map((r) => r.date), ...events.map((e) => e.date), today])
  let earnedLevel = 1
  for (const date of checkpoints) {
    if (date > today) continue
    earnedLevel = Math.max(
      earnedLevel,
      levelFrom(snapshotAt(date, profile, runs, events, baseline), profile),
    )
  }

  const regress = regressAt(runs, today)
  const level = regress ? Math.max(1, earnedLevel - 1) : earnedLevel
  const nextLevel = earnedLevel + 1
  const now = snapshotAt(today, profile, runs, events, baseline)

  return {
    level,
    earnedLevel,
    rung: rungFor(level),
    regress,
    xp,
    coins,
    events,
    next:
      nextLevel > MAX_LEVEL
        ? null
        : { rung: rungFor(nextLevel), requirements: requirementsFor(nextLevel, now, profile) },
  }
}

/** Kind words when the shorts grow back. Never blames; points at likely causes and the way back. */
export function regressMessage(r: Regress): string {
  return `Your easy runs over the last 4 weeks are about ${r.slowerSecPerKm} s/km slower than the 4 weeks before (${formatPace(r.currentEasyPace)} vs ${formatPace(r.previousEasyPace)} /km), so your shorts grew back a little. It happens to everyone: tiredness, heat, stress or a cold. Keep running easy and consistently, and the scissors come back.`
}
