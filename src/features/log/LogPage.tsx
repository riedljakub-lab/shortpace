import { useRef, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Link } from 'react-router'
import { RUN_TYPES } from '../../config/runTypes'
import { formatShortDate, isIsoDate, todayIso } from '../../domain/dates'
import { checkSpike, spikeMessage, type GuardMessage } from '../../domain/guard'
import { longestRecentKm } from '../../domain/history'
import { formatDuration, formatKm, formatPace, paceFromTime, parseKm } from '../../domain/pace'
import type { Run } from '../../domain/types'
import { useProfile } from '../../profile/profileContext'
import { useRuns } from '../../runs/runsContext'
import { Button } from '../../ui/Button'
import { RadioCards, RadioChips, TextArea, TextField } from '../../ui/form'
import { Notice } from '../../ui/Notice'
import {
  draftToRun,
  emptyRunDraft,
  livePace,
  newRunId,
  validateRunDraft,
  type RunDraft,
  type RunDraftErrors,
} from './runDraft'
import { GuardNotice, RestDayAlert } from '../guard/GuardNotice'
import { RunList } from './RunList'

const EFFORT_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const n = String(i + 1)
  return { value: n, short: n, label: `Effort ${n} of 10` }
})

const OPTIONAL_FIELDS: (keyof RunDraft)[] = ['avgHeartRate', 'splits', 'notes']

export function LogPage() {
  const { runs, addRun, deleteRun } = useRuns()
  const { profile } = useProfile()
  const today = todayIso()
  const [draft, setDraft] = useState<RunDraft>(() => emptyRunDraft(today))
  const [errors, setErrors] = useState<RunDraftErrors>({})
  const [showMore, setShowMore] = useState(false)
  const [status, setStatus] = useState<{
    tone: 'info' | 'warning'
    text: string
    guard: GuardMessage | null
  } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const pace = livePace(draft)

  /** Spike guard: compares a distance with the longest run in the 30 days before `date`. */
  const spikeFor = (km: number, date: string, when: 'draft' | 'logged') =>
    spikeMessage(km, checkSpike(km, longestRecentKm({ profile, runs, onDate: date })), when)

  // Warn while typing, before the run is saved. Never blocks saving.
  const draftKm = parseKm(draft.distanceKm)
  const draftWarning =
    draftKm && isIsoDate(draft.date) ? spikeFor(draftKm, draft.date, 'draft') : null

  // Runs that were a big jump when they happened get a tag in the list.
  const spikeRunIds = new Set(
    runs
      .filter(
        (r) =>
          checkSpike(r.distanceKm, longestRecentKm({ profile, runs, onDate: r.date })).status ===
          'spike',
      )
      .map((r) => r.id),
  )

  function update(patch: Partial<RunDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([key]) => !(key in patch))))
    setStatus(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const found = validateRunDraft(draft, today)
    if (Object.keys(found).length > 0) {
      // Open "More details" if the problem is in there, then focus the first error.
      flushSync(() => {
        setErrors(found)
        if (OPTIONAL_FIELDS.some((f) => found[f])) setShowMore(true)
      })
      const first = formRef.current?.querySelector(
        '[data-invalid] input, [data-invalid] textarea, [data-invalid] select',
      )
      if (first instanceof HTMLElement) first.focus()
      return
    }

    const run = draftToRun(draft, { id: newRunId(), now: new Date(), today })
    const guard = spikeFor(run.distanceKm, run.date, 'logged') // checked before it joins the history
    const saved = addRun(run)
    const summary = `${formatKm(run.distanceKm)} km in ${formatDuration(run.durationSec)} (${formatPace(
      paceFromTime(run.durationSec, run.distanceKm),
    )} /km)`
    setStatus(
      saved
        ? { tone: 'info', text: `Saved: ${summary}.`, guard }
        : {
            tone: 'warning',
            text: `Logged ${summary}, but this browser didn’t let us save it. It’ll be gone when you close the tab.`,
            guard,
          },
    )
    setDraft({ ...emptyRunDraft(today), date: draft.date })
    setErrors({})
    setShowMore(false)
  }

  function handleDelete(run: Run) {
    const ok = window.confirm(
      `Delete the ${formatKm(run.distanceKm)} km run from ${formatShortDate(run.date)}? This can’t be undone.`,
    )
    if (ok) deleteRun(run.id)
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="log-heading" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 id="log-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Log a run
          </h1>
          <Link
            to="/import"
            className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
          >
            Import from Garmin (CSV)
          </Link>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="run-date"
              label="Date"
              type="date"
              max={today}
              value={draft.date}
              onChange={(e) => update({ date: e.target.value })}
              error={errors.date}
              className="max-w-xs"
            />
            <TextField
              id="run-distance"
              label="Distance (km)"
              inputMode="decimal"
              placeholder="8.5"
              autoComplete="off"
              value={draft.distanceKm}
              onChange={(e) => update({ distanceKm: e.target.value })}
              error={errors.distanceKm}
              className="max-w-xs"
            />
            <TextField
              id="run-duration"
              label="Time"
              hint="mm:ss or h:mm:ss"
              placeholder="47:00"
              autoComplete="off"
              value={draft.duration}
              onChange={(e) => update({ duration: e.target.value })}
              error={errors.duration}
              className="max-w-xs"
            />
          </div>

          <p className="-mt-4 text-sm text-muted" aria-live="polite">
            {pace ? (
              <>
                Pace{' '}
                <span className="font-semibold text-ink tabular-nums">{formatPace(pace)} /km</span>
              </>
            ) : (
              'Pace appears once distance and time are filled in.'
            )}
          </p>

          <div aria-live="polite" className="-mt-4 empty:hidden">
            {draftWarning ? <GuardNotice message={draftWarning} /> : null}
          </div>

          <RadioCards
            name="run-type"
            legend="Type"
            options={RUN_TYPES.map((t) => ({
              value: t.id,
              label: t.label,
              description: t.description,
            }))}
            value={draft.type}
            onChange={(type) => update({ type })}
            className="grid-cols-2 lg:grid-cols-4"
            compact
          />

          <RadioChips
            name="run-effort"
            legend="Effort"
            hint="How hard did it feel? 1 = very easy, 10 = all-out."
            options={EFFORT_OPTIONS}
            value={draft.effort || null}
            onChange={(effort) => update({ effort })}
            error={errors.effort}
          />

          <details
            open={showMore}
            onToggle={(e) => setShowMore(e.currentTarget.open)}
            className="rounded-xl border border-line p-4"
          >
            <summary className="cursor-pointer font-medium">More details (optional)</summary>
            <div className="mt-4 flex flex-col gap-6">
              <TextField
                id="run-hr"
                label="Average heart rate (bpm)"
                inputMode="numeric"
                autoComplete="off"
                value={draft.avgHeartRate}
                onChange={(e) => update({ avgHeartRate: e.target.value })}
                error={errors.avgHeartRate}
                className="max-w-40"
              />
              <TextField
                id="run-splits"
                label="Km splits"
                hint="Pace for each km, separated by commas, like 5:31, 5:28, 5:40. Shows where in the run you speed up or fade."
                autoComplete="off"
                value={draft.splits}
                onChange={(e) => update({ splits: e.target.value })}
                error={errors.splits}
                className="max-w-xl"
              />
              <TextArea
                id="run-notes"
                label="Notes"
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
                error={errors.notes}
              />
            </div>
          </details>

          <div className="flex flex-col gap-4">
            <div>
              <Button type="submit">Save run</Button>
            </div>
            <div role="status">
              {status ? (
                <div className="flex flex-col gap-3">
                  <Notice tone={status.tone}>{status.text}</Notice>
                  {status.guard ? <GuardNotice message={status.guard} /> : null}
                </div>
              ) : null}
            </div>
            <RestDayAlert />
          </div>
        </form>
      </section>

      <section aria-labelledby="runs-heading" className="flex flex-col gap-4">
        <h2 id="runs-heading" className="text-xl font-bold tracking-tight">
          Your runs {runs.length ? <span className="text-muted">({runs.length})</span> : null}
        </h2>
        <RunList runs={runs} spikeRunIds={spikeRunIds} onDelete={handleDelete} />
      </section>
    </div>
  )
}
