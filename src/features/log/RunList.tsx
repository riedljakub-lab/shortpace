import { runTypeLabel } from '../../config/runTypes'
import { formatShortDate } from '../../domain/dates'
import { formatDuration, formatKm, formatPace, paceFromTime } from '../../domain/pace'
import type { Run } from '../../domain/types'
import { Button } from '../../ui/Button'

export function RunList({
  runs,
  spikeRunIds = new Set(),
  onDelete,
}: {
  runs: Run[]
  /** Runs that were more than 10% longer than the longest run of the 30 days before. */
  spikeRunIds?: ReadonlySet<string>
  onDelete: (run: Run) => void
}) {
  if (runs.length === 0) {
    return <p className="text-muted">No runs yet. Log your first one above.</p>
  }

  return (
    <ul aria-label="Your runs" className="flex flex-col gap-3">
      {runs.map((run) => {
        const when = formatShortDate(run.date)
        const km = formatKm(run.distanceKm)
        const details = [
          `Effort ${run.effort}/10`,
          run.avgHeartRate ? `${run.avgHeartRate} bpm` : null,
          run.splitsSecPerKm?.length ? `${run.splitsSecPerKm.length} km splits` : null,
          run.source === 'garmin' ? 'Imported' : null,
        ].filter(Boolean)

        return (
          <li
            key={run.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-line p-4"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm text-muted">
                {when} · <span className="font-medium text-ink">{runTypeLabel(run.type)}</span>
              </p>
              {/* Each value stays on one line; the row wraps between values on small phones. */}
              <p className="flex flex-wrap gap-x-2 text-lg font-semibold tabular-nums">
                <span className="whitespace-nowrap">{km} km</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">{formatDuration(run.durationSec)}</span>
                <span aria-hidden="true">·</span>
                <span className="whitespace-nowrap">
                  {formatPace(paceFromTime(run.durationSec, run.distanceKm))} /km
                </span>
              </p>
              <p className="text-sm text-muted">
                {details.join(' · ')}
                {spikeRunIds.has(run.id) ? (
                  <span className="font-semibold text-warning"> · Big jump</span>
                ) : null}
              </p>
              {run.notes ? <p className="text-sm break-words">{run.notes}</p> : null}
            </div>
            <Button
              variant="ghost"
              className="shrink-0 px-2"
              onClick={() => onDelete(run)}
              aria-label={`Delete run: ${when}, ${km} km`}
            >
              Delete
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
