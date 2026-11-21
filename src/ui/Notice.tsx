import type { ReactNode } from 'react'

/** Short info or friendly warning box. */
export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'strong'
  children: ReactNode
}) {
  const colors = {
    info: 'bg-accent-soft border-accent',
    warning: 'bg-warning-soft border-warning',
    /** For the few warnings that really matter (e.g. novice + marathon). */
    strong: 'bg-warning-soft border-danger',
  }[tone]
  return (
    <div className={`rounded-lg border-l-4 px-4 py-3 text-sm text-ink ${colors}`}>{children}</div>
  )
}
