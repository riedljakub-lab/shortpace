// Overtraining guard. Friendly warnings that explain why. They never block anything.
import { GUARD_RULES as G } from '../config/guard'
import { addDays, formatShortDate } from './dates'
import { formatKm } from './pace'
import type { Run } from './types'

export interface GuardMessage {
  tone: 'warning' | 'info'
  title: string
  body: string
}

export type SpikeResult =
  /** No runs at all in the last 30 days: nothing to compare with. */
  | { status: 'fresh-start' }
  | { status: 'ok'; limitKm: number }
  | { status: 'spike'; limitKm: number; longestKm: number; overPct: number }

/** Is `distanceKm` more than 10% longer than the longest run of the previous 30 days? */
export function checkSpike(distanceKm: number, longestRecentKm: number): SpikeResult {
  if (longestRecentKm <= 0) return { status: 'fresh-start' }
  const limitKm = longestRecentKm * (1 + G.spikeThreshold)
  if (distanceKm <= limitKm + 1e-9) return { status: 'ok', limitKm }
  return {
    status: 'spike',
    limitKm,
    longestKm: longestRecentKm,
    overPct: Math.round((distanceKm / longestRecentKm - 1) * 100),
  }
}

/** Round the safe limit DOWN to 0.1 km, so following the advice never trips the rule. */
const safeKm = (km: number) => formatKm(Math.floor(km * 10 + 1e-9) / 10)

/**
 * Message for a spike. `when`: 'draft' = still typing in the log form,
 * 'logged' = already saved, 'planned' = a run in the plan.
 */
export function spikeMessage(
  distanceKm: number,
  result: SpikeResult,
  when: 'draft' | 'logged' | 'planned',
): GuardMessage | null {
  if (result.status === 'ok') return null
  if (result.status === 'fresh-start') {
    if (when === 'planned') return null
    return {
      tone: 'info',
      title: 'Fresh start.',
      body: 'No runs logged in the last 30 days, so keep the first few short and easy. Your body adapts fast, your tendons slower.',
    }
  }
  const facts = `${formatKm(distanceKm)} km is ${result.overPct}% longer than your longest run in the last 30 days (${formatKm(result.longestKm)} km).`
  const why = 'Jumping more than 10% at once is one of the most common causes of running injuries.'
  switch (when) {
    case 'draft':
      return {
        tone: 'warning',
        title: 'That’s a big jump.',
        body: `${facts} ${why} Up to ${safeKm(result.limitKm)} km keeps you on the safe side. You can still save it.`,
      }
    case 'logged':
      return {
        tone: 'warning',
        title: 'Big jump.',
        body: `${facts} ${why} Keep the next few days easy and listen for any niggles.`,
      }
    case 'planned':
      return {
        tone: 'warning',
        title: 'Big jump.',
        body: `This is ${result.overPct}% longer than your longest run in the last 30 days (${formatKm(result.longestKm)} km). If it feels like a lot, stop at ${safeKm(result.limitKm)} km.`,
      }
  }
}

export interface RestAdvice {
  /** The easy runs that felt too hard, oldest first. */
  toughEasyRuns: Run[]
  restDay: 'today' | 'tomorrow'
}

/**
 * Effort rule: 2+ EASY runs rated 8/10 or harder within 7 days → recommend a rest day.
 * Once a rest day has been taken after the last tough run, the advice goes away.
 */
export function restDayAdvice(runs: readonly Run[], today: string): RestAdvice | null {
  const { minEffort, count, windowDays } = G.effortRule
  const from = addDays(today, -(windowDays - 1))
  const tough = runs
    .filter((r) => r.type === 'easy' && r.effort >= minEffort && r.date >= from && r.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const latest = tough.at(-1)
  if (tough.length < count || !latest) return null

  // Any day without a run between the last tough run and today = rest already taken.
  const runDates = new Set(runs.map((r) => r.date))
  for (let day = addDays(latest.date, 1); day < today; day = addDays(day, 1)) {
    if (!runDates.has(day)) return null
  }
  return { toughEasyRuns: tough, restDay: runDates.has(today) ? 'tomorrow' : 'today' }
}

export function restDayMessage(advice: RestAdvice): GuardMessage {
  const days = advice.toughEasyRuns.map((r) => formatShortDate(r.date).split(' ')[0]).join(', ')
  return {
    tone: 'warning',
    title: 'Time for a rest day.',
    body: `${advice.toughEasyRuns.length} of your easy runs this week felt like ${G.effortRule.minEffort}/10 or harder (${days}). Easy runs should feel easy; when they don’t, your body is asking for recovery. Take ${advice.restDay} off. Rest days earn XP too.`,
  }
}
