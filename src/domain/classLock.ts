import { CLASS_LOCK_DAYS } from '../config/profileRules'
import { daysBetween } from './dates'

export interface ClassLockStatus {
  locked: boolean
  /** 0 when unlocked. */
  daysLeft: number
}

/**
 * The first 30 days after picking a class are locked (days 0–29).
 * After that, switching is allowed but costs coins (M7).
 */
export function classLockStatus(
  chosenOn: string,
  today: string,
  lockDays: number = CLASS_LOCK_DAYS,
): ClassLockStatus {
  const daysLeft = Math.max(0, lockDays - daysBetween(chosenOn, today))
  return { locked: daysLeft > 0, daysLeft }
}
