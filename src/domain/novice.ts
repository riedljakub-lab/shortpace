import type { Profile } from './types'

/**
 * Novice = can't run 30 minutes non-stop OR hasn't run regularly in the last 3 months.
 * Novices start their plan in a base phase (M5).
 */
export function isNovice(p: Pick<Profile, 'canRun30Min' | 'ranRegularly3Months'>): boolean {
  return !p.canRun30Min || !p.ranRegularly3Months
}

/** A novice picking the marathon gets a strong warning and a suggested path. They may continue. */
export function needsMarathonWarning(
  p: Pick<Profile, 'canRun30Min' | 'ranRegularly3Months' | 'distanceClass'>,
): boolean {
  return isNovice(p) && p.distanceClass === 'marathon'
}
