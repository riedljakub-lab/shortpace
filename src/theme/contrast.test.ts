import { describe, expect, it } from 'vitest'
import css from '../index.css?raw'

/*
 * Reads the real color tokens from index.css and checks WCAG AA contrast:
 * 4.5:1 for text, 3:1 for UI parts like the focus ring.
 * If someone tweaks a color and breaks accessibility, this test goes red.
 */

function tokens(block: RegExp): Record<string, string> {
  const body = css.match(block)?.[1] ?? ''
  return Object.fromEntries(
    [...body.matchAll(/--sp-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]),
  )
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

// [foreground, background, minimum ratio]
const PAIRS: [string, string, number][] = [
  ['ink', 'canvas', 4.5],
  ['ink', 'surface', 4.5],
  ['muted', 'canvas', 4.5],
  ['muted', 'surface', 4.5],
  ['accent', 'canvas', 4.5],
  ['accent', 'surface', 4.5],
  ['accent', 'accent-soft', 4.5],
  ['on-accent', 'accent', 4.5],
  ['on-accent', 'accent-hover', 4.5],
  ['on-accent', 'success', 4.5], // check marks in the level checklist
  ['warning', 'canvas', 4.5],
  ['warning', 'warning-soft', 4.5],
  ['danger', 'canvas', 4.5],
  ['success', 'canvas', 4.5],
  ['ink', 'accent-soft', 4.5],
  ['ink', 'warning-soft', 4.5],
  // Form controls (input borders, choice cards) need 3:1 against what's around them.
  ['control', 'canvas', 3],
  ['control', 'surface', 3],
]

const THEMES = {
  light: tokens(/:root\s*\{([^}]*)\}/),
  dark: tokens(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/),
}

describe.each(Object.entries(THEMES))('%s theme contrast (WCAG AA)', (_name, colors) => {
  it('defines every token used in the checks', () => {
    for (const [fg, bg] of PAIRS) {
      expect(colors[fg], `--sp-${fg}`).toBeDefined()
      expect(colors[bg], `--sp-${bg}`).toBeDefined()
    }
  })

  it.each(PAIRS)('%s on %s is at least %s:1', (fg, bg, min) => {
    expect(contrast(colors[fg] ?? '#000000', colors[bg] ?? '#000000')).toBeGreaterThanOrEqual(min)
  })
})
