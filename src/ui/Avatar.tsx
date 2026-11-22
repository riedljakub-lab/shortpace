import { useId } from 'react'
import { avatar, type AvatarId, type Build, type HairStyle } from '../config/avatars'
import type { ShortsPattern } from '../config/cosmetics'

/*
 * Cartoon runner drawn in SVG. Everything comes from config/avatars.ts.
 * Only the shorts are dynamic: `inseamCm` sets their length (M7 maps level → inseam),
 * `cargoPocket` adds the pocket (level 1 and the "regress" state).
 * Fixed illustration colors sit on their own light backdrop, so they read in both themes.
 */

const OUTLINE = '#1e293b'
const BACKDROP = '#e8eef8'
const SHOE = '#f8fafc'

const SHOULDER: Record<Build, number> = { slim: 22, regular: 25, broad: 29 }
const HIP: Record<Build, number> = { slim: 17, regular: 19, broad: 22 }

/** Pixels of shorts leg per cm of inseam (30 cm ≈ just above the knee). */
const PX_PER_CM = 1.3

function HairBack({ style, color }: { style: HairStyle; color: string }) {
  if (style === 'long') {
    return <path d="M41 38C39 20 52 16 60 16s21 6 19 22l3 32c-8 4-36 4-44 0Z" fill={color} />
  }
  if (style === 'ponytail') {
    return <path d="M74 30c12 2 14 22 8 34-2-8-6-18-8-26Z" fill={color} />
  }
  return null
}

function HairFront({ style, color }: { style: HairStyle; color: string }) {
  switch (style) {
    case 'buzz':
      return <path d="M43 36c1-11 9-15 17-15s16 4 17 15c-6-6-11-8-17-8s-11 2-17 8Z" fill={color} />
    case 'curly':
      return (
        <g fill={color}>
          <circle cx="45" cy="31" r="7" />
          <circle cx="53" cy="24" r="8" />
          <circle cx="63" cy="23" r="8" />
          <circle cx="72" cy="28" r="7" />
          <circle cx="77" cy="37" r="5" />
          <circle cx="43" cy="39" r="5" />
        </g>
      )
    case 'bun':
      return (
        <g fill={color}>
          <circle cx="60" cy="17" r="8" />
          <path d="M42 40c-2-18 10-22 20-21 12 1 18 9 16 21-4-8-10-11-18-11s-14 4-18 11Z" />
        </g>
      )
    case 'long':
      return (
        <path
          d="M42 40c0-14 8-20 18-20s18 6 18 20c-6-10-12-12-20-10-6 1-12 5-16 10Z"
          fill={color}
        />
      )
    case 'short':
    case 'ponytail':
      return (
        <path
          d="M42 40c-2-18 10-22 20-21 12 1 18 9 16 21-4-8-10-11-18-11s-14 4-18 11Z"
          fill={color}
        />
      )
  }
}

/** Thick limb with an outline: a dark wide line under a colored narrower one. */
function Limb({ d, color, width }: { d: string; color: string; width: number }) {
  return (
    <>
      <path d={d} stroke={OUTLINE} strokeWidth={width + 4} strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" />
    </>
  )
}

export interface AvatarProps {
  avatarId: AvatarId
  /** Shorts inseam in cm. Default 30 = level 1 cargo shorts. */
  inseamCm?: number
  shortsColor?: string
  /** Cosmetic from the shop: plain, side racing stripe, or checkered. */
  shortsPattern?: ShortsPattern
  /** Defaults to on for long (cargo-length) shorts. Also shown while regressing. */
  cargoPocket?: boolean
  /** Side split at the hem (split shorts and shorter). */
  split?: boolean
  className?: string
  /** Set when a visible text label already describes the avatar. */
  decorative?: boolean
}

export function Avatar({
  avatarId,
  inseamCm = 30,
  shortsColor = '#334155',
  shortsPattern = 'plain',
  cargoPocket,
  split = false,
  className,
  decorative = false,
}: AvatarProps) {
  const look = avatar(avatarId)
  const patternId = `checks-${useId().replace(/:/g, '')}`
  const sh = SHOULDER[look.build]
  const hip = HIP[look.build]
  const crotch = 136
  const hem = crotch + Math.max(1, inseamCm) * PX_PER_CM
  const showPocket = cargoPocket ?? inseamCm >= 25
  // The pocket shrinks to fit, so it can appear on short shorts too (regress).
  const pocketHeight = Math.min(11, hem - 132.5)
  const outerLeft = 60 - hip - 3
  const outerRight = 60 + hip + 3

  return (
    <svg
      viewBox="0 0 120 220"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : look.description}
      aria-hidden={decorative ? true : undefined}
      focusable="false"
      fill="none"
      strokeLinejoin="round"
    >
      <circle cx="60" cy="120" r="56" fill={BACKDROP} />

      <HairBack style={look.hairStyle} color={look.hair} />

      {/* legs + shoes */}
      <rect
        x={60 - hip + 3}
        y="128"
        width="12"
        height="70"
        fill={look.skin}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <rect
        x={60 + hip - 15}
        y="128"
        width="12"
        height="70"
        fill={look.skin}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <rect
        x={60 - hip - 1}
        y="195"
        width="19"
        height="9"
        rx="4.5"
        fill={SHOE}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <rect
        x={60 + hip - 18}
        y="195"
        width="19"
        height="9"
        rx="4.5"
        fill={SHOE}
        stroke={OUTLINE}
        strokeWidth="2"
      />

      {/* arms (behind the shirt) */}
      <Limb d={`M${60 - sh + 4} 78 L${60 - sh - 4} 126`} color={look.skin} width={9} />
      <Limb d={`M${60 + sh - 4} 78 L${60 + sh + 4} 126`} color={look.skin} width={9} />

      {/* shirt + sleeves */}
      <path
        d={`M${60 - sh} 74 Q60 64 ${60 + sh} 74 L${60 + hip + 1} 130 L${60 - hip - 1} 130 Z`}
        fill={look.shirt}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <Limb d={`M${60 - sh + 4} 77 L${60 - sh + 1} 90`} color={look.shirt} width={11} />
      <Limb d={`M${60 + sh - 4} 77 L${60 + sh - 1} 90`} color={look.shirt} width={11} />

      {/* SHORTS: the only part that changes with level (length) or the shop (color/pattern) */}
      {shortsPattern === 'checks' ? (
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#f8fafc" />
            <rect width="3" height="3" fill={shortsColor} />
            <rect x="3" y="3" width="3" height="3" fill={shortsColor} />
          </pattern>
        </defs>
      ) : null}
      <path
        d={`M${60 - hip - 1} 124 H${60 + hip + 1} L${60 + hip + 3} ${hem} H61.5 L60 ${crotch} L58.5 ${hem} H${60 - hip - 3} Z`}
        fill={shortsPattern === 'checks' ? `url(#${patternId})` : shortsColor}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      {shortsPattern === 'stripe' ? (
        <g stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round">
          <path d={`M${60 - hip + 0.5} 130 L${60 - hip - 0.5} ${hem - 1}`} />
          <path d={`M${60 + hip - 0.5} 130 L${60 + hip + 0.5} ${hem - 1}`} />
        </g>
      ) : null}
      <path d={`M${60 - hip - 1} 128.5 H${60 + hip + 1}`} stroke={OUTLINE} strokeWidth="1.5" />
      {showPocket && pocketHeight >= 4 ? (
        <g stroke={OUTLINE} strokeWidth="1.5">
          <rect
            x={60 - hip - 1}
            y={hem - 2 - pocketHeight}
            width="9"
            height={pocketHeight}
            rx="1.5"
          />
          <path d={`M${60 - hip - 1} ${hem - 2 - pocketHeight * 0.65} h9`} />
        </g>
      ) : null}
      {split ? (
        // Little V-shaped side splits at the outer hem.
        <g fill={look.skin} stroke={OUTLINE} strokeWidth="1.2" strokeLinejoin="round">
          <path
            d={`M${outerLeft} ${hem} L${outerLeft + 3.5} ${hem} L${outerLeft + 1.2} ${hem - 4} Z`}
          />
          <path
            d={`M${outerRight} ${hem} L${outerRight - 3.5} ${hem} L${outerRight - 1.2} ${hem - 4} Z`}
          />
        </g>
      ) : null}

      {/* neck + head + face */}
      <rect
        x="54"
        y="54"
        width="12"
        height="14"
        fill={look.skin}
        stroke={OUTLINE}
        strokeWidth="2"
      />
      <circle cx="60" cy="40" r="18" fill={look.skin} stroke={OUTLINE} strokeWidth="2" />
      <HairFront style={look.hairStyle} color={look.hair} />
      <circle cx="53" cy="42" r="2" fill={OUTLINE} />
      <circle cx="67" cy="42" r="2" fill={OUTLINE} />
      <path d="M53 48q7 6 14 0" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
