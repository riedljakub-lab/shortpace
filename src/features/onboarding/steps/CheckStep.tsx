import { distanceClass } from '../../../config/distances'
import { NOVICE_MARATHON_PATH, SAFETY_LINE } from '../../../config/safety'
import { isNovice, needsMarathonWarning } from '../../../domain/novice'
import { formatDuration, formatPace } from '../../../domain/pace'
import { ambitionLevel, realityCheck, type RaceEstimate } from '../../../domain/realityCheck'
import { Button } from '../../../ui/Button'
import { Notice } from '../../../ui/Notice'
import { draftToProfile } from '../draft'
import type { StepProps } from '../stepProps'

function Estimate({ label, estimate }: { label: string; estimate: RaceEstimate }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{formatDuration(estimate.timeSec)}</dd>
      <dd className="text-sm text-muted tabular-nums">{formatPace(estimate.paceSecPerKm)} /km</dd>
    </div>
  )
}

export function CheckStep({ draft, update }: StepProps) {
  // Every earlier step is valid by now, so the draft converts cleanly.
  const profile = draftToProfile(draft)
  const cls = distanceClass(profile.distanceClass)
  const check = realityCheck(profile)
  const novice = isNovice(profile)
  const marathonWarning = needsMarathonWarning(profile)
  const showSafetyLine = novice || profile.distanceClass === 'marathon'

  return (
    <div className="flex flex-col gap-6">
      {check.status === 'no-baseline' ? (
        <>
          <dl className="rounded-xl bg-surface p-5">
            <Estimate label={`Your goal for the ${cls.label}`} estimate={check.goal} />
          </dl>
          <Notice>
            We can’t predict your time yet because we don’t know your current speed. Log a few runs
            and we’ll compare your goal with real data.
          </Notice>
        </>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-surface p-5">
            <Estimate label={`Predicted ${cls.label} today`} estimate={check.predicted} />
            <Estimate label="Your goal" estimate={check.goal} />
          </dl>
          {check.status === 'beyond' && ambitionLevel(check.gapPct) === 'stretch' ? (
            <Notice tone="warning">
              <strong>Ambitious goal.</strong> It’s {check.gapSecPerKm} s/km ({check.gapPct}%)
              faster than what your current fitness predicts. Doable with patient training, but
              think months, not weeks. You can keep it.
            </Notice>
          ) : null}
          {check.status === 'beyond' && ambitionLevel(check.gapPct) === 'long-term' ? (
            <Notice tone="warning">
              <strong>That’s a long-term goal.</strong> It’s {check.gapSecPerKm} s/km (
              {check.gapPct}%) faster than what your current fitness predicts. Gaps this big usually
              take a year or more of steady training. You can keep it, and we’ll track your progress
              toward it step by step.
            </Notice>
          ) : null}
          {check.status === 'within-reach' ? (
            <Notice>
              <strong>Within reach.</strong> Your goal matches what your current fitness predicts.
              Nice and realistic.
            </Notice>
          ) : null}
          <p className="text-sm text-muted">
            Prediction uses the Riegel formula from your{' '}
            {profile.baseline.kind === 'race' ? 'race time' : 'easy pace'}. It’s an estimate, not a
            promise.
          </p>
        </>
      )}

      {novice ? (
        <Notice>
          <strong>Base phase first.</strong> You’re starting fresh, so your plan begins with easy
          runs that build the habit before any speed work. That’s how goals stick.
        </Notice>
      ) : null}

      {marathonWarning ? (
        <Notice tone="strong">
          <div className="flex flex-col gap-3">
            <p>
              <strong>A marathon is a big first goal.</strong> Without a running base, 42 km carries
              a real risk of injury and burnout. Most runners get there step by step:
            </p>
            <ol className="flex flex-wrap items-center gap-2 font-semibold">
              {NOVICE_MARATHON_PATH.map((id, i) => (
                <li key={id} className="flex items-center gap-2">
                  {i > 0 ? <span aria-hidden="true">→</span> : null}
                  {distanceClass(id).label}
                </li>
              ))}
            </ol>
            <p>You can still go for the marathon. It’s your call.</p>
            <div>
              <Button variant="secondary" onClick={() => update({ distanceClass: '5k' })}>
                Switch to 5K instead
              </Button>
            </div>
          </div>
        </Notice>
      ) : null}

      {showSafetyLine ? <p className="text-sm font-medium text-ink">{SAFETY_LINE}</p> : null}
    </div>
  )
}
