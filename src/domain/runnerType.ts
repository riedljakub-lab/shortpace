// Runner type classification with transparent rules (config/runnerTypes.ts).
import {
  REVEAL_AFTER_RUNS,
  RUNNER_TYPES,
  TYPE_PRIORITY,
  TYPE_RULES as R,
  type RunnerTypeId,
} from '../config/runnerTypes'
import { daysBetween, formatShortDate, weekdayOf } from './dates'
import { formatPace, paceFromTime } from './pace'
import type { Run } from './types'

export interface RunnerFeatures {
  runs: number
  fastShare: number
  trailShare: number
  weekendShare: number
  detailShare: number
  notesCount: number
  /** Standard deviation of pace ÷ average pace (0.05 = very steady). */
  paceSpread: number
  avgPaceSec: number
  /** Typical distance from the average pace, in s/km. */
  typicalDeviationSec: number
  runsPerWeek: number
  longestBreak: { days: number; from: string; to: string; runsAfter: number } | null
}

export interface RunnerTypeResult {
  type: RunnerTypeId
  name: string
  description: string
  /** False when no rule is clearly met and this is just the closest match. */
  clearMatch: boolean
  /** The 2–3 plain facts that led to it. */
  facts: string[]
}

const pct = (share: number) => Math.round(share * 100)
const shareOf = (runs: readonly Run[], test: (r: Run) => boolean) =>
  runs.length ? runs.filter(test).length / runs.length : 0

export function runnerFeatures(runs: readonly Run[]): RunnerFeatures {
  const sorted = [...runs].sort((a, b) => a.date.localeCompare(b.date))
  const paces = sorted.map((r) => paceFromTime(r.durationSec, r.distanceKm))
  const avg = paces.reduce((s, p) => s + p, 0) / Math.max(1, paces.length)
  const sd = Math.sqrt(paces.reduce((s, p) => s + (p - avg) ** 2, 0) / Math.max(1, paces.length))
  const deviations = paces.map((p) => Math.abs(p - avg)).sort((a, b) => a - b)

  let longestBreak: RunnerFeatures['longestBreak'] = null
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const next = sorted[i]
    if (!prev || !next) continue
    const days = daysBetween(prev.date, next.date)
    if (!longestBreak || days > longestBreak.days) {
      longestBreak = { days, from: prev.date, to: next.date, runsAfter: sorted.length - i }
    }
  }

  const first = sorted[0]?.date
  const last = sorted.at(-1)?.date
  const weeks = first && last ? Math.max(1, (daysBetween(first, last) + 1) / 7) : 1
  const trailWords = R.trailGoat.words

  return {
    runs: runs.length,
    fastShare: shareOf(runs, (r) => r.type === 'fast' || r.type === 'race'),
    trailShare: shareOf(runs, (r) =>
      trailWords.some((w) => (r.notes ?? '').toLowerCase().includes(w)),
    ),
    weekendShare: shareOf(runs, (r) => ['sat', 'sun'].includes(weekdayOf(r.date))),
    detailShare: shareOf(runs, (r) => Boolean(r.splitsSecPerKm?.length || r.avgHeartRate)),
    notesCount: runs.filter((r) => r.notes?.trim()).length,
    paceSpread: avg ? sd / avg : 0,
    avgPaceSec: avg,
    typicalDeviationSec: Math.round(deviations[Math.floor(deviations.length / 2)] ?? 0),
    runsPerWeek: Math.round((runs.length / weeks) * 10) / 10,
    longestBreak,
  }
}

/** How strongly each rule fits: 1 or more = the rule is met. */
export function typeStrengths(f: RunnerFeatures): Record<RunnerTypeId, number> {
  const brk = f.longestBreak
  const comebackMet =
    brk !== null &&
    brk.days >= R.comebackKid.minBreakDays &&
    brk.runsAfter >= R.comebackKid.minRunsAfter
  return {
    diesel: R.diesel.maxPaceSpread / Math.max(f.paceSpread, 0.0001),
    sprinter: f.fastShare / R.sprinter.minFastShare,
    'trail-goat': f.trailShare / R.trailGoat.minTrailShare,
    'comeback-kid': comebackMet
      ? 1 + brk.days / 100
      : Math.min(0.99, ((brk?.days ?? 0) / R.comebackKid.minBreakDays) * 0.9),
    'weekend-warrior': f.weekendShare / R.weekendWarrior.minWeekendShare,
    'data-goblin': f.detailShare / R.dataGoblin.minDetailShare,
  }
}

function factFor(type: RunnerTypeId, f: RunnerFeatures): string {
  const of = (share: number) =>
    `${Math.round(share * f.runs)} of your ${f.runs} runs (${pct(share)}%)`
  switch (type) {
    case 'diesel':
      return `Your pace barely changes: most runs are within ±${f.typicalDeviationSec} s/km of ${formatPace(f.avgPaceSec)} /km.`
    case 'sprinter':
      return `${of(f.fastShare)} were fast sessions or races.`
    case 'trail-goat':
      return `${of(f.trailShare)} mention trails or hills.`
    case 'comeback-kid': {
      const b = f.longestBreak
      return b
        ? `You took a ${b.days}-day break (${formatShortDate(b.from)} to ${formatShortDate(b.to)}) and came back with ${b.runsAfter} runs since.`
        : 'You’ve run without a long break.'
    }
    case 'weekend-warrior':
      return `${of(f.weekendShare)} were on a Saturday or Sunday.`
    case 'data-goblin':
      return `${pct(f.detailShare)}% of your runs have km splits or heart rate${f.notesCount ? `, and ${f.notesCount} have notes` : ''}.`
  }
}

/** Null until there are enough runs for an honest verdict. */
export function classifyRunner(runs: readonly Run[]): RunnerTypeResult | null {
  if (runs.length < REVEAL_AFTER_RUNS) return null
  const f = runnerFeatures(runs)
  const strengths = typeStrengths(f)
  const met = TYPE_PRIORITY.filter((t) => strengths[t] >= 1)
  const closest = [...TYPE_PRIORITY].sort((a, b) => strengths[b] - strengths[a])[0] ?? 'diesel'
  const winner = met[0] ?? closest
  const runnerUp = met[1]
  const info = RUNNER_TYPES.find((t) => t.id === winner) ?? RUNNER_TYPES[0]

  const facts = [factFor(winner, f)]
  if (runnerUp) {
    const name = RUNNER_TYPES.find((t) => t.id === runnerUp)?.name ?? runnerUp
    facts.push(
      `Also a bit of a ${name}: ${factFor(runnerUp, f).charAt(0).toLowerCase()}${factFor(runnerUp, f).slice(1)}`,
    )
  }
  facts.push(`${f.runs} runs logged, about ${f.runsPerWeek} a week.`)

  return {
    type: winner,
    name: info.name,
    description: info.description,
    clearMatch: met.length > 0,
    facts,
  }
}
