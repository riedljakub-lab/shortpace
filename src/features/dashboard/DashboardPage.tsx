import { Link, Navigate } from 'react-router'
import { shortsStyle } from '../../config/cosmetics'
import { SPLIT_FROM_LEVEL } from '../../config/levels'
import { ghostCategory } from '../../config/records'
import {
  gapByKm,
  gapByType,
  gapSummary,
  ghostGap,
  longestVsLimit,
  pacePoints,
  REGRESS_REASON_TEXT,
  regressReasons,
  weeklyKm,
} from '../../domain/dashboard'
import { formatShortDate, todayIso } from '../../domain/dates'
import { progression, regressMessage } from '../../domain/levels'
import { formatDuration, formatKm, formatPace } from '../../domain/pace'
import { runTypeLabel } from '../../config/runTypes'
import { useProfile } from '../../profile/profileContext'
import { useRuns } from '../../runs/runsContext'
import { useTheme } from '../../theme/themeContext'
import { Avatar } from '../../ui/Avatar'
import { Notice } from '../../ui/Notice'
import { useWallet } from '../../wallet/walletContext'
import { ChartCard, Legend, LegendItem } from './ChartCard'
import {
  GapTrendChart,
  KmGapChart,
  LongestChart,
  PaceChart,
  TypeGapChart,
  WeeklyKmChart,
} from './charts'
import { chartColors } from './chartTheme'
import { signedSec } from './format'

/** Default export so the router can load this page (and the chart library) only when needed. */
export default function DashboardPage() {
  const { profile } = useProfile()
  const { runs } = useRuns()
  const { wallet } = useWallet()
  const { resolved } = useTheme()

  if (!profile) return <Navigate to="/onboarding" replace />

  const today = todayIso()
  const colors = chartColors(resolved)
  const goal = profile.goalPaceSecPerKm
  const progress = progression(profile, runs, today)
  const shorts = shortsStyle(wallet.equippedShorts)
  const ghost = ghostGap(profile, runs, today)
  const gap = gapSummary(runs, goal)
  const points = pacePoints(runs, goal)
  const byType = gapByType(runs, goal)
  const byKm = gapByKm(runs, goal)
  const weeks = weeklyKm(runs, today)
  const longest = longestVsLimit(profile, runs, today)
  const metRequirements = progress.next?.requirements.filter((r) => r.met).length ?? 0
  const totalRequirements = progress.next?.requirements.length ?? 1

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Level */}
        <section
          aria-labelledby="level-title"
          className="flex items-center gap-4 rounded-xl bg-surface p-4"
        >
          <Avatar
            avatarId={profile.avatarId}
            inseamCm={progress.rung.inseamCm}
            cargoPocket={progress.level === 1 || progress.regress !== null}
            split={progress.level >= SPLIT_FROM_LEVEL}
            shortsColor={shorts.color}
            shortsPattern={shorts.pattern}
            decorative
            className="h-28 w-auto shrink-0"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="level-title" className="text-sm text-muted">
              Level {progress.level}
            </h2>
            <p className="font-bold">
              {progress.rung.name} · {formatKm(progress.rung.inseamCm)} cm
            </p>
            {progress.next ? (
              <>
                <p className="text-sm text-muted">
                  Next: {progress.next.rung.name}. {metRequirements} of {totalRequirements} done.
                </p>
                <div
                  role="progressbar"
                  aria-label="Progress to next level"
                  aria-valuemin={0}
                  aria-valuemax={totalRequirements}
                  aria-valuenow={metRequirements}
                  className="h-1.5 overflow-hidden rounded-full bg-line"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(metRequirements / totalRequirements) * 100}%` }}
                  />
                </div>
                <Link
                  to="/"
                  className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
                >
                  What’s missing
                </Link>
              </>
            ) : (
              <p className="text-sm">Top of the ladder.</p>
            )}
          </div>
        </section>

        {/* Record Ghost */}
        <section
          aria-labelledby="ghost-title"
          className="flex flex-col gap-1 rounded-xl bg-surface p-4"
        >
          <h2 id="ghost-title" className="text-sm text-muted">
            Record Ghost
          </h2>
          {ghost ? (
            <>
              <p className="text-2xl font-bold">{formatKm(ghost.behindKm)} km behind</p>
              <p className="text-sm text-muted">
                When the Record Ghost finishes the {ghost.distanceLabel} in{' '}
                {formatDuration(ghost.ghostSec)}, you’d be at {formatKm(ghost.yourKmAtGhostFinish)}{' '}
                km (your estimate: {formatDuration(ghost.yourSec)}).
              </p>
              <p className="text-xs text-muted">
                Czech national record pace, {ghostCategory(profile.sex)}
                {profile.sex === 'unspecified' ? ' (neutral default)' : ''}. Reference only.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">
              Log a run of 2 km or more to see how far behind the ghost you’d be.
            </p>
          )}
        </section>

        {/* Gap to goal */}
        <section
          aria-labelledby="gap-title"
          className="flex flex-col gap-1 rounded-xl bg-surface p-4"
        >
          <h2 id="gap-title" className="text-sm text-muted">
            Gap to goal pace ({formatPace(goal)} /km)
          </h2>
          {gap ? (
            <>
              <p className="text-2xl font-bold">
                {gap.currentSec <= 0 ? 'On goal pace' : `${gap.currentSec} s/km slower`}
              </p>
              <p className="text-sm text-muted">
                Average of your last 5 runs.{' '}
                {gap.changeSec === null
                  ? 'The trend appears after 10 runs.'
                  : gap.changeSec < 0
                    ? `${Math.abs(gap.changeSec)} s/km closer than the 5 runs before.`
                    : gap.changeSec > 0
                      ? `${gap.changeSec} s/km further than the 5 runs before.`
                      : 'Same as the 5 runs before.'}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Log a run to see your gap to goal pace.</p>
          )}
        </section>
      </div>

      {progress.regress ? (
        <section aria-labelledby="regress-title" className="flex flex-col gap-2">
          <h2 id="regress-title" className="text-xl font-bold tracking-tight">
            Why your shorts grew back
          </h2>
          <Notice tone="warning">{regressMessage(progress.regress)}</Notice>
          <ul className="flex flex-col gap-2">
            {regressReasons(runs, today).map((reason) => (
              <li key={reason} className="rounded-lg bg-surface p-3 text-sm">
                <strong>Likely reason: </strong>
                {REGRESS_REASON_TEXT[reason]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {runs.length < 2 ? (
        <Notice>
          Log at least 2 runs to see your charts. Every run you add makes them more useful.
        </Notice>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            id="pace"
            title="Pace vs goal"
            description="Each dot is a run. Up is faster."
            table={{
              columns: ['Date', 'Type', 'Pace', 'vs goal'],
              rows: points.map((p) => [
                formatShortDate(p.date),
                runTypeLabel(p.type),
                `${formatPace(p.paceSec)} /km`,
                signedSec(p.gapSec),
              ]),
            }}
          >
            <PaceChart data={points} goal={goal} colors={colors} />
          </ChartCard>

          <ChartCard
            id="gap"
            title="Gap to goal, trend"
            description="Average of 5 runs at a time, so easy and hard days balance out. Up is closer to goal."
            table={{
              columns: ['Date', 'This run', '5-run average'],
              rows: points.map((p) => [
                formatShortDate(p.date),
                signedSec(p.gapSec),
                signedSec(p.rollingGapSec),
              ]),
            }}
          >
            <GapTrendChart data={points} colors={colors} />
          </ChartCard>

          <ChartCard
            id="by-type"
            title="Where you’re missing: by run type"
            description="Seconds per km vs goal. Easy and long runs are meant to be slower than goal pace."
            table={{
              columns: ['Type', 'Runs', 'vs goal (per km)'],
              rows: byType.map((t) => [t.label, t.runs, signedSec(t.avgGapSec)]),
            }}
          >
            <TypeGapChart data={byType} colors={colors} />
          </ChartCard>

          {byKm.length ? (
            <ChartCard
              id="by-km"
              title="Where you’re missing: by kilometre"
              description="From runs with km splits. Shows where in a run you fade (or finish strong)."
              table={{
                columns: ['Km', 'Runs', 'vs goal (per km)'],
                rows: byKm.map((k) => [k.label, k.runs, signedSec(k.avgGapSec)]),
              }}
            >
              <KmGapChart data={byKm} colors={colors} />
            </ChartCard>
          ) : (
            <section className="flex flex-col gap-2 rounded-xl border border-line p-4">
              <h2 className="font-bold tracking-tight">Where you’re missing: by kilometre</h2>
              <p className="text-sm text-muted">
                Add km splits under “More details” when you log a run, and this chart shows where in
                the run you fade or finish strong.
              </p>
            </section>
          )}

          <ChartCard
            id="weekly"
            title="Weekly km"
            description="Last 12 weeks, Monday to Sunday."
            table={{
              columns: ['Week of', 'Km'],
              rows: weeks.map((w) => [w.label, formatKm(w.km)]),
            }}
          >
            <WeeklyKmChart data={weeks} colors={colors} />
          </ChartCard>

          <ChartCard
            id="longest"
            title="Longest run vs the spike limit"
            description="Runs more than 10% longer than your longest of the previous 30 days are a common injury cause."
            legend={
              <Legend>
                <LegendItem color={colors.series1} kind="block">
                  Longest run
                </LegendItem>
                <LegendItem color={colors.reference} kind="dashed">
                  Spike limit (+10%)
                </LegendItem>
                <LegendItem color={colors.alert} kind="block">
                  Big jump
                </LegendItem>
              </Legend>
            }
            table={{
              columns: ['Week of', 'Longest', 'Limit', 'Big jump'],
              rows: longest.map((w) => [
                w.label,
                w.longestKm === null ? '–' : `${formatKm(w.longestKm)} km`,
                w.limitKm === null ? 'fresh start' : `${formatKm(w.limitKm)} km`,
                w.bigJump ? 'Yes' : 'No',
              ]),
            }}
          >
            <LongestChart data={longest} colors={colors} />
          </ChartCard>
        </div>
      )}
    </div>
  )
}
