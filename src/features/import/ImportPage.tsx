import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import {
  FIELD_LABELS,
  IMPORT_FIELDS,
  REQUIRED_FIELDS,
  type ImportField,
} from '../../config/importRules'
import { runTypeLabel } from '../../config/runTypes'
import { formatShortDate, todayIso } from '../../domain/dates'
import { formatDuration, formatKm, formatPace, paceFromTime } from '../../domain/pace'
import { buildImport, summariseSkipped, type SkippedRow } from '../../import/buildImport'
import { guessMapping, parseCsvText, type ParsedCsv } from '../../import/csv'
import { useRuns } from '../../runs/runsContext'
import { Button } from '../../ui/Button'
import { RadioCards, SelectField } from '../../ui/form'
import { Notice } from '../../ui/Notice'
import { newRunId } from '../log/runDraft'

type Stage =
  | { kind: 'choose' }
  | { kind: 'map'; fileName: string; csv: ParsedCsv }
  | { kind: 'done'; imported: number; skipped: SkippedRow[]; saved: boolean }

const PREVIEW_ROWS = 10
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function SkippedList({ skipped }: { skipped: SkippedRow[] }) {
  if (!skipped.length) return null
  return (
    <ul aria-label="Skipped rows" className="flex flex-col gap-1 text-sm">
      {summariseSkipped(skipped).map(({ reason, rows }) => (
        <li key={reason}>
          <span className="font-semibold">{reason}</span>{' '}
          <span className="text-muted">
            ({rows.length === 1 ? 'row' : 'rows'} {rows.join(', ')})
          </span>
        </li>
      ))}
    </ul>
  )
}

export function ImportPage() {
  const { runs, replaceRuns } = useRuns()
  const [stage, setStage] = useState<Stage>({ kind: 'choose' })
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({})
  const [unit, setUnit] = useState<'km' | 'mi'>('km')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const today = todayIso()

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const csv = parseCsvText(await file.text())
    if (!csv.headers.length || !csv.rows.length) {
      setError('This file has no rows we can read. Is it the CSV export from Garmin Connect?')
      return
    }
    setError(null)
    setMapping(guessMapping(csv.headers))
    setStage({ kind: 'map', fileName: file.name, csv })
  }

  const chooseButton = (label: string, variant: 'primary' | 'secondary' = 'primary') => (
    <Button variant={variant} onClick={() => fileRef.current?.click()}>
      {label}
    </Button>
  )

  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f])
  const plan =
    stage.kind === 'map' && missingRequired.length === 0
      ? buildImport(stage.csv, { mapping, unit }, runs, { today, now: new Date(), newId: newRunId })
      : null

  function handleImport() {
    if (stage.kind !== 'map') return
    // Build again at the moment of import, so ids and timestamps are fresh.
    const final = buildImport(stage.csv, { mapping, unit }, runs, {
      today,
      now: new Date(),
      newId: newRunId,
    })
    const saved = replaceRuns([...runs, ...final.runs])
    setStage({ kind: 'done', imported: final.runs.length, skipped: final.skipped, saved })
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Import from Garmin</h1>
        <p className="text-muted">
          The file is read here in your browser. Nothing is uploaded anywhere.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Choose a Garmin CSV export"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFile}
      />
      <div role="status">{error ? <Notice tone="warning">{error}</Notice> : null}</div>

      {stage.kind === 'choose' ? (
        <section aria-labelledby="how-heading" className="flex flex-col gap-4">
          <h2 id="how-heading" className="text-xl font-bold tracking-tight">
            Export your activities
          </h2>
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            <li>Open Garmin Connect on the web.</li>
            <li>Go to Activities → All Activities.</li>
            <li>Scroll down to load the runs you want, then choose “Export CSV”.</li>
            <li>Pick that file here.</li>
          </ol>
          <div>{chooseButton('Choose CSV file')}</div>
        </section>
      ) : null}

      {stage.kind === 'map' ? (
        <>
          <section aria-labelledby="columns-heading" className="flex flex-col gap-4">
            <div>
              <h2 id="columns-heading" className="text-xl font-bold tracking-tight">
                1. Check the columns
              </h2>
              <p className="text-sm text-muted">
                {stage.fileName}: {plural(stage.csv.rows.length, 'row')}. We guessed which column is
                which; change anything that’s wrong.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {IMPORT_FIELDS.map((field) => {
                const column = mapping[field]
                const sample = column ? stage.csv.rows[0]?.[column] : undefined
                const required = REQUIRED_FIELDS.includes(field)
                return (
                  <div key={field} className="flex flex-col gap-1">
                    <SelectField
                      id={`map-${field}`}
                      label={`${FIELD_LABELS[field]}${required ? '' : ' (optional)'}`}
                      value={column ?? ''}
                      onChange={(e) =>
                        setMapping((m) => ({ ...m, [field]: e.target.value || undefined }))
                      }
                      error={required && !column ? 'Pick the column with this.' : undefined}
                    >
                      <option value="">Not in this file</option>
                      {stage.csv.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </SelectField>
                    {sample !== undefined ? (
                      <p className="text-xs text-muted">e.g. “{sample}”</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <RadioCards
              name="unit"
              legend="Distances in the file are in"
              options={[
                { value: 'km', label: 'Kilometres' },
                { value: 'mi', label: 'Miles' },
              ]}
              value={unit}
              onChange={setUnit}
              className="max-w-sm grid-cols-2"
              compact
            />
          </section>

          <section aria-labelledby="preview-heading" className="flex flex-col gap-4">
            <h2 id="preview-heading" className="text-xl font-bold tracking-tight">
              2. Preview
            </h2>
            {plan ? (
              <>
                <p className="text-lg">
                  <strong>{plural(plan.runs.length, 'run')}</strong> ready to import
                  {plan.skipped.length
                    ? `, ${plural(plan.skipped.length, 'row')} will be skipped`
                    : ''}
                  .
                </p>
                {plan.runs.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Runs to import (first {PREVIEW_ROWS})</caption>
                      <thead>
                        <tr className="border-b border-line">
                          {['Date', 'Distance', 'Time', 'Pace', 'Type (estimated)'].map((c) => (
                            <th
                              key={c}
                              scope="col"
                              className="whitespace-nowrap py-2 pr-3 font-semibold"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plan.runs.slice(0, PREVIEW_ROWS).map((r) => (
                          <tr key={r.id} className="border-b border-line last:border-0">
                            <td className="whitespace-nowrap py-1.5 pr-3">
                              {formatShortDate(r.date)}
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">
                              {formatKm(r.distanceKm)} km
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">
                              {formatDuration(r.durationSec)}
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums">
                              {formatPace(paceFromTime(r.durationSec, r.distanceKm))} /km
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-3">
                              {runTypeLabel(r.type)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {plan.runs.length > PREVIEW_ROWS ? (
                      <p className="mt-2 text-sm text-muted">
                        …and {plural(plan.runs.length - PREVIEW_ROWS, 'more run')}.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <SkippedList skipped={plan.skipped} />
                <p className="text-sm text-muted">
                  Garmin doesn’t record run type or effort the way ShortPace does, so they’re
                  estimated from the title and distance. Imported runs count for your charts and
                  levels; only runs since you started earn XP and coins.
                </p>
              </>
            ) : (
              <Notice tone="warning">
                Pick the columns for {missingRequired.map((f) => FIELD_LABELS[f]).join(', ')} to see
                the preview.
              </Notice>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleImport}
                disabled={!plan?.runs.length}
                className="disabled:opacity-50"
              >
                {plan?.runs.length
                  ? `Import ${plural(plan.runs.length, 'run')}`
                  : 'Nothing to import'}
              </Button>
              {chooseButton('Choose another file', 'secondary')}
            </div>
          </section>
        </>
      ) : null}

      {stage.kind === 'done' ? (
        <section aria-labelledby="done-heading" className="flex flex-col gap-4">
          <h2 id="done-heading" className="text-xl font-bold tracking-tight">
            Imported {plural(stage.imported, 'run')}
          </h2>
          {!stage.saved ? (
            <Notice tone="warning">
              This browser didn’t let us save them (private mode?). They’ll be gone when you close
              the tab.
            </Notice>
          ) : null}
          {stage.skipped.length ? (
            <div className="flex flex-col gap-2">
              <p>Skipped {plural(stage.skipped.length, 'row')}:</p>
              <SkippedList skipped={stage.skipped} />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Link
              to="/log"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              See your runs
            </Link>
            <Link
              to="/dashboard"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Open the dashboard
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  )
}
