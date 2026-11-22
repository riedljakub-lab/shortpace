import { Link, Navigate, useLocation } from 'react-router'
import { distanceClass } from '../config/distances'
import { persona } from '../config/personas'
import { classLockStatus } from '../domain/classLock'
import { todayIso, weekdayLabel, WEEKDAYS } from '../domain/dates'
import { formatPace } from '../domain/pace'
import { longestRecentKm } from '../domain/history'
import { SPLIT_FROM_LEVEL } from '../config/levels'
import { progression } from '../domain/levels'
import { generateWeekPlan } from '../domain/plan'
import { sessionTarget } from '../features/plan/sessionText'
import { RestDayAlert } from '../features/guard/GuardNotice'
import { LevelUpGate } from '../features/progress/LevelUpGate'
import { ProgressCard } from '../features/progress/ProgressCard'
import { useProfile } from '../profile/profileContext'
import { useRuns } from '../runs/runsContext'
import { shortsStyle } from '../config/cosmetics'
import { coinBalance } from '../domain/wallet'
import { useWallet } from '../wallet/walletContext'
import { Avatar } from '../ui/Avatar'
import { Notice } from '../ui/Notice'

export function HomePage() {
  const { profile } = useProfile()
  const { runs } = useRuns()
  const { wallet } = useWallet()
  const location = useLocation()
  const saveFailed = (location.state as { saveFailed?: boolean } | null)?.saveFailed === true

  // New here? The avatar screen is the first thing you see.
  if (!profile) return <Navigate to="/onboarding" replace />

  const cls = distanceClass(profile.distanceClass)
  const today = todayIso()
  const lock = classLockStatus(profile.classChosenOn, today)
  const todaysSession = generateWeekPlan({
    profile,
    weekOf: today,
    longestRecentKm: longestRecentKm({ profile, runs, onDate: today }),
  }).days.find((d) => d.date === today)?.session
  const progress = progression(profile, runs, today)
  const shorts = shortsStyle(wallet.equippedShorts)
  const days = profile.runDays
    .map((id) => WEEKDAYS.find((d) => d.id === id)?.short ?? id)
    .join(', ')

  return (
    <section className="flex flex-col gap-8">
      {saveFailed ? (
        <Notice tone="warning">
          This browser didn’t let us save your profile (private mode?). It will be gone when you
          close the tab.
        </Notice>
      ) : null}

      <LevelUpGate level={progress.level} />

      <RestDayAlert />

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Avatar
          avatarId={profile.avatarId}
          inseamCm={progress.rung.inseamCm}
          cargoPocket={progress.level === 1 || progress.regress !== null}
          split={progress.level >= SPLIT_FROM_LEVEL}
          shortsColor={shorts.color}
          shortsPattern={shorts.pattern}
          className="h-56 w-auto shrink-0"
        />
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <p className="text-sm font-medium text-muted">{persona(profile.persona).name}</p>
          <h1 className="text-3xl font-bold tracking-tight">Training for the {cls.label}</h1>
          <p className="text-lg text-muted">
            Goal pace{' '}
            <span className="font-semibold text-ink">
              {formatPace(profile.goalPaceSecPerKm)} /km
            </span>
          </p>
        </div>
      </div>

      {todaysSession ? (
        <section
          aria-labelledby="today-heading"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-accent p-5"
        >
          <div>
            <h2 id="today-heading" className="text-sm font-medium text-muted">
              Today
            </h2>
            <p className="text-xl font-bold">
              {todaysSession.title}
              {sessionTarget(todaysSession) ? ` · ${sessionTarget(todaysSession)}` : ''}
            </p>
            <p className="text-sm text-muted">{todaysSession.detail}</p>
          </div>
          <Link to="/plan" className="font-semibold text-accent underline-offset-4 hover:underline">
            See your week
          </Link>
        </section>
      ) : null}

      <ProgressCard progress={progress} coinBalance={coinBalance(progress.coins, wallet)} />

      <dl className="grid gap-4 rounded-xl bg-surface p-5 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Run days</dt>
          <dd className="font-semibold">{days}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Long run</dt>
          <dd className="font-semibold">{weekdayLabel(profile.longRunDay)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Distance class</dt>
          <dd className="font-semibold">
            {lock.locked ? `Locked for ${lock.daysLeft} more days` : 'Switchable (costs coins)'}
          </dd>
        </div>
      </dl>
    </section>
  )
}
