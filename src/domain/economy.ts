// XP and coins, calculated from your data (never stored, so they can't drift out of sync).
import { EARNINGS as E } from '../config/economy'
import { addDays, mondayOf } from './dates'
import { generateWeekPlan, type WeekPlan } from './plan'
import type { Profile, Run } from './types'

export interface EarningEvent {
  date: string
  kind: 'run' | 'rest-day' | 'week-complete'
  xp: number
  coins: number
  label: string
}

const RUN_KINDS = new Set(['easy', 'long', 'quality'])

/** Every reward earned from the start date up to (not including) today, plus today's runs. */
export function earningEvents(
  profile: Profile,
  runs: readonly Run[],
  today: string,
): EarningEvent[] {
  const start = profile.classChosenOn
  const events: EarningEvent[] = []
  const runDates = new Set(runs.map((r) => r.date))

  // Runs: from the start date on.
  for (const run of runs) {
    if (run.date < start || run.date > today) continue
    events.push({
      date: run.date,
      kind: 'run',
      xp: E.xp.perRun + Math.round(run.distanceKm * E.xp.perKm),
      coins: E.coins.perRun,
      label: `Run on ${run.date}`,
    })
  }

  // Plans per week (only the day kinds matter here, not the distances).
  const plans = new Map<string, WeekPlan>()
  const planFor = (date: string) => {
    const monday = mondayOf(date)
    let plan = plans.get(monday)
    if (!plan) {
      plan = generateWeekPlan({ profile, weekOf: monday, longestRecentKm: 0 })
      plans.set(monday, plan)
    }
    return plan
  }

  // Rest days: a planned rest day that is over and had no run.
  for (let day = start; day < today; day = addDays(day, 1)) {
    const planned = planFor(day).days.find((d) => d.date === day)
    if (planned?.session.kind === 'rest' && !runDates.has(day)) {
      events.push({
        date: day,
        kind: 'rest-day',
        xp: E.xp.perRestDay,
        coins: E.coins.perRestDay,
        label: `Rest day on ${day}`,
      })
    }
  }

  // Complete weeks and streaks: only weeks that are fully over.
  let streak = 0
  for (let monday = mondayOf(start); addDays(monday, 6) < today; monday = addDays(monday, 7)) {
    const plan = planFor(monday)
    // Only days from the start date count (joining on a Saturday shouldn't fail week 1).
    const planned = plan.days.filter((d) => RUN_KINDS.has(d.session.kind) && d.date >= start).length
    const sunday = addDays(monday, 6)
    const logged = runs.filter(
      (r) => r.date >= monday && r.date <= sunday && r.date >= start,
    ).length
    if (planned === 0) continue // nothing was planned yet: neither completes nor breaks a streak
    if (logged >= planned) {
      streak += 1
      const bonus = Math.min(E.coins.maxStreakBonus, (streak - 1) * E.coins.streakBonusPerWeek)
      events.push({
        date: sunday,
        kind: 'week-complete',
        xp: E.xp.weekComplete,
        coins: E.coins.weekComplete + bonus,
        label: streak > 1 ? `Week complete (${streak}-week streak)` : 'Week complete',
      })
    } else {
      streak = 0
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}

/** XP and coins earned up to and including `onDate` (default: everything). */
export function totals(
  events: readonly EarningEvent[],
  onDate?: string,
): { xp: number; coins: number } {
  return events
    .filter((e) => onDate === undefined || e.date <= onDate)
    .reduce((sum, e) => ({ xp: sum.xp + e.xp, coins: sum.coins + e.coins }), { xp: 0, coins: 0 })
}

/** Current week streak: complete weeks in a row, ending with last week. */
export function currentStreak(events: readonly EarningEvent[], today: string): number {
  const lastSunday = addDays(mondayOf(today), -1)
  const completeSundays = new Set(
    events.filter((e) => e.kind === 'week-complete').map((e) => e.date),
  )
  let streak = 0
  for (let sunday = lastSunday; completeSundays.has(sunday); sunday = addDays(sunday, -7)) streak++
  return streak
}
