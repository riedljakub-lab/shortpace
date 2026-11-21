import type { SVGProps } from 'react'

/*
 * Logo mark: line-drawn shorts, a dashed cut line at the hem, loose threads falling off.
 * Uses currentColor, so it takes the text color of wherever it sits.
 * public/favicon.svg is the same drawing with fixed colors. Keep them in sync.
 */
export function LogoMark({ title, ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {/* waistband */}
      <path d="M10 6h28v5H10z" />
      {/* legs */}
      <path d="M10 11 7 33M38 11l3 22M24 21l-3 12M24 21l3 12" />
      {/* dashed cut line (the hem) */}
      <path d="M7 33h14M27 33h14" strokeDasharray="2.5 3" />
      {/* loose threads */}
      <path
        d="M11 35.5c0 2.5-1.6 3.5-.8 6.5M17 35.5c.3 2 1.6 2.4 1.2 4.8M31 35.5c-.4 2.3-1.8 3-1.3 5.5M37 35.5c.2 2.2 1.3 3.2.6 5.8"
        strokeWidth="1.6"
      />
    </svg>
  )
}

/** Mark + "ShortPace" wordmark, for the header. */
export function Logo() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
      <LogoMark className="h-8 w-8 text-accent" />
      ShortPace
    </span>
  )
}
