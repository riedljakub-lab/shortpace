// Checks wallet data read from storage or a backup.
import { DEFAULT_SHORTS, SHORTS_STYLE_IDS } from '../config/cosmetics'
import { DISTANCE_CLASS_IDS } from '../config/distances'
import { isIsoDate } from '../domain/dates'
import { EMPTY_WALLET, type Purchase, type Wallet } from '../domain/wallet'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isOneOf = <T extends string>(list: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v)

function parsePurchase(v: unknown): Purchase | null {
  if (!isObj(v) || typeof v.id !== 'string' || !isIsoDate(v.date)) return null
  if (typeof v.cost !== 'number' || !Number.isFinite(v.cost) || v.cost < 0) return null
  if (v.kind === 'shorts' && isOneOf(SHORTS_STYLE_IDS, v.itemId)) {
    return { id: v.id, date: v.date, kind: 'shorts', itemId: v.itemId, cost: v.cost }
  }
  if (
    v.kind === 'class-switch' &&
    isOneOf(DISTANCE_CLASS_IDS, v.from) &&
    isOneOf(DISTANCE_CLASS_IDS, v.to)
  ) {
    return { id: v.id, date: v.date, kind: 'class-switch', from: v.from, to: v.to, cost: v.cost }
  }
  return null
}

/** Never null: unknown or damaged data falls back to an empty wallet. */
export function parseWallet(v: unknown): Wallet {
  if (!isObj(v) || !Array.isArray(v.purchases)) return EMPTY_WALLET
  const purchases = v.purchases.map(parsePurchase).filter((p): p is Purchase => p !== null)
  const equipped = isOneOf(SHORTS_STYLE_IDS, v.equippedShorts) ? v.equippedShorts : DEFAULT_SHORTS
  return { purchases, equippedShorts: equipped }
}
