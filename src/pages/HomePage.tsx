import { Navigate, useLocation } from 'react-router'
import { distanceClass } from '../config/distances'
import { persona } from '../config/personas'
import { classLockStatus } from '../domain/classLock'
import { todayIso, weekdayLabel, WEEKDAYS } from '../domain/dates'
import { formatPace } from '../domain/pace'
import { useProfile } from '../profile/profileContext'
import { Avatar } from '../ui/Avatar'
import { Notice } from '../ui/Notice'

export function HomePage() {
  const { profile } = useProfile()
  const location = useLocation()
  const saveFailed = (location.state as { saveFailed?: boolean } | null)?.saveFailed === true

  // New here? The avatar screen is the first thing you see.
  if (!profile) return <Navigate to="/onboarding" replace />

  const cls = distanceClass(profile.distanceClass)
  const lock = classLockStatus(profile.classChosenOn, todayIso())
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

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Avatar avatarId={profile.avatarId} className="h-56 w-auto shrink-0" />
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
