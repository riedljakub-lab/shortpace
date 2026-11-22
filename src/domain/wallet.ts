// Spending coins. Earned coins are calculated (economy.ts); only purchases are stored.
// Balance = earned − spent.
import { DEFAULT_SHORTS, shortsStyle, type ShortsStyleId } from '../config/cosmetics'
import { distanceClass, type DistanceClassId } from '../config/distances'
import { CLASS_SWITCH_COST } from '../config/economy'
import { classLockStatus } from './classLock'
import type { Profile } from './types'

export type Purchase =
  | { id: string; date: string; kind: 'shorts'; itemId: ShortsStyleId; cost: number }
  | {
      id: string
      date: string
      kind: 'class-switch'
      from: DistanceClassId
      to: DistanceClassId
      cost: number
    }

export interface Wallet {
  purchases: Purchase[]
  equippedShorts: ShortsStyleId
}

export const EMPTY_WALLET: Wallet = { purchases: [], equippedShorts: DEFAULT_SHORTS }

export function spentCoins(wallet: Wallet): number {
  return wallet.purchases.reduce((sum, p) => sum + p.cost, 0)
}

export function coinBalance(earnedCoins: number, wallet: Wallet): number {
  return earnedCoins - spentCoins(wallet)
}

export function ownsShorts(wallet: Wallet, id: ShortsStyleId): boolean {
  return (
    shortsStyle(id).price === 0 ||
    wallet.purchases.some((p) => p.kind === 'shorts' && p.itemId === id)
  )
}

export type Check = { ok: true } | { ok: false; message: string }

export function canBuyShorts(wallet: Wallet, id: ShortsStyleId, balance: number): Check {
  if (ownsShorts(wallet, id)) return { ok: false, message: 'You already own these.' }
  const price = shortsStyle(id).price
  if (balance < price) {
    return { ok: false, message: `You need ${price - balance} more coins. Keep running!` }
  }
  return { ok: true }
}

export function buyShorts(
  wallet: Wallet,
  id: ShortsStyleId,
  date: string,
  purchaseId: string,
): Wallet {
  return {
    purchases: [
      ...wallet.purchases,
      { id: purchaseId, date, kind: 'shorts', itemId: id, cost: shortsStyle(id).price },
    ],
    equippedShorts: id, // put them on straight away
  }
}

export function equipShorts(wallet: Wallet, id: ShortsStyleId): Wallet {
  return ownsShorts(wallet, id) ? { ...wallet, equippedShorts: id } : wallet
}

/** Switching distance: never during the 30-day lock, then for coins. */
export function canSwitchClass(
  profile: Pick<Profile, 'classChosenOn' | 'distanceClass'>,
  to: DistanceClassId,
  today: string,
  balance: number,
): Check {
  const lock = classLockStatus(profile.classChosenOn, today)
  if (lock.locked) {
    return {
      ok: false,
      message: `Your first 30 days stay on the ${distanceClass(profile.distanceClass).label}. ${lock.daysLeft} more ${lock.daysLeft === 1 ? 'day' : 'days'} to go. Coins can’t skip this.`,
    }
  }
  if (to === profile.distanceClass) return { ok: false, message: 'That’s your current distance.' }
  if (balance < CLASS_SWITCH_COST) {
    return {
      ok: false,
      message: `Switching costs ${CLASS_SWITCH_COST} coins. You need ${CLASS_SWITCH_COST - balance} more.`,
    }
  }
  return { ok: true }
}

export function recordClassSwitch(
  wallet: Wallet,
  from: DistanceClassId,
  to: DistanceClassId,
  date: string,
  purchaseId: string,
): Wallet {
  return {
    ...wallet,
    purchases: [
      ...wallet.purchases,
      { id: purchaseId, date, kind: 'class-switch', from, to, cost: CLASS_SWITCH_COST },
    ],
  }
}
