import { regressMessage, type Progression } from '../../domain/levels'
import { formatKm } from '../../domain/pace'
import { Notice } from '../../ui/Notice'

/** Current shorts, XP, coins, and exactly what the next level needs. */
export function ProgressCard({ progress }: { progress: Progression }) {
  const { rung, next, regress } = progress
  return (
    <section
      aria-labelledby="progress-heading"
      className="flex flex-col gap-4 rounded-xl bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress-heading" className="text-xl font-bold tracking-tight">
          Level {progress.level} · {rung.name}
        </h2>
        <p className="text-lg font-semibold tabular-nums">{formatKm(rung.inseamCm)} cm inseam</p>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-muted">XP</dt>
          <dd className="text-2xl font-bold tabular-nums">{progress.xp}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Coins</dt>
          <dd className="text-2xl font-bold tabular-nums">{progress.coins}</dd>
        </div>
      </dl>

      {regress ? (
        <Notice tone="warning">
          <strong>Cargo pocket alert.</strong> {regressMessage(regress)}
        </Notice>
      ) : null}

      {next ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">
            Next: {next.rung.name} ({formatKm(next.rung.inseamCm)} cm)
          </h3>
          <ul aria-label="What the next level needs" className="flex flex-col gap-2">
            {next.requirements.map((req) => (
              <li key={req.label} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    req.met ? 'bg-success text-on-accent' : 'border border-control'
                  }`}
                >
                  {req.met ? '✓' : ''}
                </span>
                <span>
                  <span className="sr-only">{req.met ? 'Done: ' : 'Not yet: '}</span>
                  {req.label}: <span className="font-semibold tabular-nums">{req.have}</span>{' '}
                  <span className="text-muted">(need {req.need})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-semibold">Top of the ladder. The Record Ghost has company.</p>
      )}
    </section>
  )
}
