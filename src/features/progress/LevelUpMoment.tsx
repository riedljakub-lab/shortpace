import { useEffect, useRef } from 'react'
import { rungFor } from '../../domain/levels'
import { formatKm } from '../../domain/pace'
import { Button } from '../../ui/Button'

function Scissors() {
  return (
    <svg
      viewBox="0 0 48 32"
      className="h-10 w-auto animate-snip text-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="8" r="5" />
      <circle cx="8" cy="24" r="5" />
      <path d="M12 11 44 22M12 21 44 10" />
    </svg>
  )
}

/**
 * The level-up moment: scissors snip along the dashed line and the new inseam drops in.
 * With "reduce motion" there is no animation, just the update.
 */
export function LevelUpMoment({
  from,
  to,
  onDone,
}: {
  from: number
  to: number
  onDone: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const before = rungFor(from)
  const after = rungFor(to)

  // Move focus here so screen-reader users hear the news.
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <section
      aria-labelledby="levelup-heading"
      className="flex flex-col items-center gap-3 rounded-xl border-2 border-accent bg-accent-soft p-6 text-center"
    >
      <div className="flex w-full max-w-56 flex-col items-center">
        <Scissors />
        <div aria-hidden="true" className="w-full border-t-2 border-dashed border-accent" />
      </div>
      <h2
        ref={headingRef}
        id="levelup-heading"
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight outline-none"
      >
        Level up! {after.name}
      </h2>
      <p className="flex items-baseline gap-3 text-3xl font-bold tabular-nums">
        <span className="text-muted line-through">{formatKm(before.inseamCm)} cm</span>
        <span aria-hidden="true">→</span>
        <span className="inline-block animate-drop">{formatKm(after.inseamCm)} cm</span>
      </p>
      <p>Snip! Your shorts just got shorter.</p>
      <Button onClick={onDone}>Nice!</Button>
    </section>
  )
}
