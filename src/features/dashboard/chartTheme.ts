import type { ResolvedTheme } from '../../theme/theme'

/*
 * Chart colors. Series colors are the validated data-viz palette (slot 1 blue, slot 2 orange),
 * checked with the palette validator against OUR surfaces: light #ffffff, dark #0b1120
 * (lightness band, chroma, colour-blind separation, 3:1 contrast all pass).
 * Grid/axis/text colors reuse the app's design tokens.
 */
export interface ChartColors {
  series1: string
  series2: string
  /** Status "serious": only for a big-jump week, always with a label in legend/tooltip/table. */
  alert: string
  grid: string
  axis: string
  reference: string
  surface: string
}

export function chartColors(theme: ResolvedTheme): ChartColors {
  return theme === 'dark'
    ? {
        series1: '#3987e5',
        series2: '#d95926',
        alert: '#ec835a',
        grid: '#24304a',
        axis: '#9aa6b8',
        reference: '#c3c8d2',
        surface: '#0b1120',
      }
    : {
        series1: '#2a78d6',
        series2: '#eb6834',
        alert: '#ec835a',
        grid: '#dde3ec',
        axis: '#475569',
        reference: '#475569',
        surface: '#ffffff',
      }
}
