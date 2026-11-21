import type { ReactNode } from 'react'

/** Short info or friendly warning box. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning'
  children: ReactNode
}) {
  const colors =
    tone === 'warning' ? 'bg-warning-soft border-warning' : 'bg-accent-soft border-accent'
  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm text-ink ${colors}`}>{children}</div>
  )
}
