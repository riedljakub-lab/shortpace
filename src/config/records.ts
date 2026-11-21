/*
 * RECORD GHOSTS: Czech national records, used as the level-10 bar and as a reference.
 * TODO: verify every value against the official Czech athletics federation lists before launch.
 * Always shown as "Record Ghost", never by the athlete's name.
 */
import type { Sex } from '../domain/types'
import type { DistanceClassId } from './distances'

const t = (h: number, m: number, s: number) => h * 3600 + m * 60 + s

export const RECORD_GHOSTS: Record<'men' | 'women', Record<DistanceClassId, number>> = {
  men: { '5k': t(0, 14, 13), '10k': t(0, 28, 19), half: t(1, 1, 31), marathon: t(2, 11, 57) },
  women: { '5k': t(0, 15, 37), '10k': t(0, 31, 5), half: t(1, 8, 44), marathon: t(2, 23, 44) },
}

/** "Prefer not to say" uses the men's records as a neutral default (shown with a note). */
export function ghostCategory(sex: Sex): 'men' | 'women' {
  return sex === 'women' ? 'women' : 'men'
}

export function recordGhostTime(sex: Sex, distance: DistanceClassId): number {
  return RECORD_GHOSTS[ghostCategory(sex)][distance]
}
