/*
 * SHORTS SHOP. Cosmetics only change the shorts' color or pattern.
 * Length always stays tied to your level. Prices are PLACEHOLDER (coins, no real money).
 */

export type ShortsPattern = 'plain' | 'stripe' | 'checks'

export const SHORTS_STYLES = [
  { id: 'charcoal', name: 'Charcoal', color: '#334155', pattern: 'plain', price: 0 },
  { id: 'cobalt', name: 'Cobalt', color: '#1e4fd6', pattern: 'plain', price: 40 },
  { id: 'track-red', name: 'Track red', color: '#d7263d', pattern: 'plain', price: 40 },
  { id: 'sunset', name: 'Sunset orange', color: '#f77f00', pattern: 'plain', price: 40 },
  { id: 'volt', name: 'Volt', color: '#b8e017', pattern: 'plain', price: 60 },
  { id: 'flamingo', name: 'Flamingo', color: '#ff5fa2', pattern: 'plain', price: 60 },
  { id: 'racing-stripe', name: 'Racing stripe', color: '#1f2937', pattern: 'stripe', price: 80 },
  { id: 'checkered', name: 'Checkered flag', color: '#1f2937', pattern: 'checks', price: 100 },
] as const satisfies readonly {
  id: string
  name: string
  color: string
  pattern: ShortsPattern
  price: number
}[]

export type ShortsStyleId = (typeof SHORTS_STYLES)[number]['id']
export const SHORTS_STYLE_IDS = SHORTS_STYLES.map((s) => s.id)
export const DEFAULT_SHORTS: ShortsStyleId = 'charcoal'

export function shortsStyle(id: ShortsStyleId) {
  return SHORTS_STYLES.find((s) => s.id === id) ?? SHORTS_STYLES[0]
}
