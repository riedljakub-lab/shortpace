import { useState, type ReactNode } from 'react'
import { Button } from '../../ui/Button'

export interface ChartTable {
  columns: string[]
  rows: (string | number)[][]
}

/**
 * Every chart lives in one of these: title, one-line explanation, and a Table toggle.
 * The table is the accessible way to read every value (tooltips only enhance).
 */
export function ChartCard({
  id,
  title,
  description,
  table,
  legend,
  children,
}: {
  id: string
  title: string
  description?: ReactNode
  table: ChartTable
  /** Shown above the chart when there are 2+ series, so identity is never color alone. */
  legend?: ReactNode
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  const titleId = `chart-${id}-title` // prefixed so it never clashes with other ids on the page

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="font-bold tracking-tight">
            {title}
          </h2>
          {description ? <p className="text-sm text-muted">{description}</p> : null}
        </div>
        <Button
          variant="secondary"
          className="min-h-9 shrink-0 px-3 text-sm"
          aria-pressed={showTable}
          aria-label={`Show ${title} as a table`}
          onClick={() => setShowTable((v) => !v)}
        >
          Table
        </Button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr className="border-b border-line">
                {table.columns.map((c) => (
                  <th key={c} scope="col" className="py-2 pr-3 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, i) => (
                <tr key={i} className="border-b border-line last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="py-1.5 pr-3 tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {legend}
          {/* The SVG is hidden from screen readers; the Table button gives the same numbers. */}
          <div
            role="img"
            aria-label={`${title}. Use the Table button to read the values.`}
            className="h-64 w-full"
          >
            {children}
          </div>
        </>
      )}
    </section>
  )
}

/** Small colored key for a legend: a line or a block, plus a text label in normal ink. */
export function LegendItem({
  color,
  kind,
  children,
}: {
  color: string
  kind: 'line' | 'block' | 'dashed'
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-2">
      <svg width="18" height="10" aria-hidden="true">
        {kind === 'block' ? (
          <rect width="18" height="10" rx="2" fill={color} />
        ) : (
          <line
            x1="0"
            y1="5"
            x2="18"
            y2="5"
            stroke={color}
            strokeWidth="2"
            strokeDasharray={kind === 'dashed' ? '4 3' : undefined}
          />
        )}
      </svg>
      {children}
    </li>
  )
}

export function Legend({ children }: { children: ReactNode }) {
  return <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">{children}</ul>
}

/** Tooltip box in app tokens (readable in both themes). */
export function TooltipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-ink shadow-md">
      <p className="font-semibold">{title}</p>
      {lines.map((l) => (
        <p key={l} className="tabular-nums">
          {l}
        </p>
      ))}
    </div>
  )
}
