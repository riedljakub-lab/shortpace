import { useState } from 'react'
import { Navigate } from 'react-router'
import { PLAN_IS_DRAFT } from '../../config/planRules'
import { addDays, formatShortDate, mondayOf, todayIso, weekdayLabel } from '../../domain/dates'
import { longestRecentKm } from '../../domain/history'
import { baseWeeksFor, generateWeekPlan, type DayPlan } from '../../domain/plan'
import { useProfile } from '../../profile/profileContext'
import { useRuns } from '../../runs/runsContext'
import { Button } from '../../ui/Button'
import { sessionTarget } from './sessionText'

/** How far ahead you can look. */
const MAX_WEEKS_AHEAD = 4

function DayCard({ day, isToday }: { day: DayPlan; isToday: boolean }) {
  const { session } = day
  const target = sessionTarget(session)
  const rest = session.kind === 'rest'
  return (
    <li
      aria-current={isToday ? 'date' : undefined}
      className={`flex gap-4 rounded-xl border p-4 ${
        isToday ? 'border-2 border-accent' : 'border-line'
      } ${session.hard ? 'bg-accent-soft' : rest ? 'bg-surface' : 'bg-canvas'}`}
    >
      <div className="w-12 shrink-0">
        <p className="font-semibold">{weekdayLabel(day.day).slice(0, 3)}</p>
        <p className="text-sm text-muted">
          {formatShortDate(day.date).split(' ').slice(1).join(' ')}
        </p>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`font-semibold ${rest ? 'text-muted' : ''}`}>{session.title}</span>
          {/* {' '} adds a real space for screen readers; the flex gap handles the visual spacing. */}
          {target ? (
            <>
              {' '}
              <span className="font-semibold tabular-nums">· {target}</span>
            </>
          ) : null}
          {session.hard ? (
            <span className="rounded-full border border-accent px-2 text-xs font-semibold text-accent">
              Hard
            </span>
          ) : null}
          {isToday ? (
            <span className="rounded-full bg-accent px-2 text-xs font-semibold text-on-accent">
              Today
            </span>
          ) : null}
        </p>
        <p className="text-sm text-muted">{session.detail}</p>
      </div>
    </li>
  )
}

export function PlanPage() {
  const { profile } = useProfile()
  const { runs } = useRuns()
  const [weeksAhead, setWeeksAhead] = useState(0)

  if (!profile) return <Navigate to="/onboarding" replace />

  const today = todayIso()
  const weekOf = addDays(mondayOf(today), weeksAhead * 7)
  const plan = generateWeekPlan({
    profile,
    weekOf,
    longestRecentKm: longestRecentKm({ profile, runs, onDate: weeksAhead === 0 ? today : weekOf }),
  })
  const firstDay = plan.days[0]?.date ?? weekOf
  const lastDay = plan.days[6]?.date ?? weekOf
  const buildStartsInWeek = baseWeeksFor(profile) + 1

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your plan</h1>
        {PLAN_IS_DRAFT ? (
          <p className="self-start rounded-full border border-warning bg-warning-soft px-3 py-1 text-sm font-semibold text-ink">
            Draft plan, coach review pending
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Week {plan.weekNumber} · {plan.phase === 'base' ? 'Base phase' : 'Build phase'}
          </h2>
          <p className="text-sm text-muted">
            {formatShortDate(firstDay)} – {formatShortDate(lastDay)}
            {weeksAhead === 0 ? ' · this week' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setWeeksAhead((w) => Math.max(0, w - 1))}
            disabled={weeksAhead === 0}
            className="disabled:opacity-50"
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            onClick={() => setWeeksAhead((w) => Math.min(MAX_WEEKS_AHEAD, w + 1))}
            disabled={weeksAhead === MAX_WEEKS_AHEAD}
            className="disabled:opacity-50"
          >
            Next week
          </Button>
        </div>
      </div>

      <p className="text-muted">
        {plan.phase === 'base'
          ? `Easy running only, to build the habit safely. Harder sessions start in week ${buildStartsInWeek}.`
          : 'Harder sessions are never on back-to-back days. Rest days are part of the plan and earn XP.'}
      </p>

      <ol aria-label={`Week ${plan.weekNumber} sessions`} className="flex flex-col gap-3">
        {plan.days.map((day) => (
          <DayCard key={day.day} day={day} isToday={day.date === today} />
        ))}
      </ol>
    </div>
  )
}
