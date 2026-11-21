import { HALF_MARATHON_KM, MARATHON_EXPONENT, RIEGEL_EXPONENT } from '../config/prediction'

/**
 * Classic exponent up to the half marathon; stricter one when the marathon is
 * involved (in either direction, so predictions stay consistent both ways).
 */
export function exponentFor(fromKm: number, toKm: number): number {
  return Math.max(fromKm, toKm) > HALF_MARATHON_KM + 0.01 ? MARATHON_EXPONENT : RIEGEL_EXPONENT
}

/**
 * Riegel formula: T2 = T1 × (D2 / D1) ^ exponent.
 * Example: 25:00 for 5K → about 52:07 for 10K.
 */
export function predictTime(
  timeSec: number,
  fromKm: number,
  toKm: number,
  exponent: number = exponentFor(fromKm, toKm),
): number {
  if (timeSec <= 0 || fromKm <= 0 || toKm <= 0)
    throw new Error('Time and distances must be positive')
  return timeSec * (toKm / fromKm) ** exponent
}
