// Age groups and age grading.
import type { DistanceClassId } from '../config/distances'

/** 5-year bands from 35 up, as in masters athletics. PLACEHOLDER: confirm the bands. */
const BANDS = [35, 40, 45, 50, 55, 60, 65, 70] as const

export function ageGroup(age: number): string {
  if (age < BANDS[0]) return 'Under 35'
  const lower = [...BANDS].reverse().find((b) => age >= b) ?? BANDS[0]
  return lower === 70 ? '70+' : `${lower}–${lower + 4}`
}

/**
 * Age grading compares your time with the best possible time for your age and sex.
 * INTERFACE ONLY. TODO: plug in age-grading tables once their license is confirmed.
 * Until then there is no table, so no score is shown.
 */
export interface AgeGradingTable {
  /** The age-standard time in seconds, or null if the table doesn't cover it. */
  standardSec(sex: 'men' | 'women', age: number, distance: DistanceClassId): number | null
}

/** Age-graded score in % (100% = age-group world standard). Null without a licensed table. */
export function ageGradedPercent(
  timeSec: number,
  input: { sex: 'men' | 'women'; age: number; distance: DistanceClassId },
  table: AgeGradingTable | null = null,
): number | null {
  const standard = table?.standardSec(input.sex, input.age, input.distance)
  if (!standard || timeSec <= 0) return null
  return Math.round((standard / timeSec) * 1000) / 10
}
