import { distanceClass, type DistanceClassId } from '../config/distances'
import { EASY_TO_5K_RACE_OFFSET_SEC_PER_KM, VERY_AMBITIOUS_GAP_PCT } from '../config/prediction'
import { paceFromTime, timeFromPace } from './pace'
import { predictTime } from './riegel'
import type { Baseline } from './types'

export interface RaceEstimate {
  timeSec: number
  paceSecPerKm: number
}

export type RealityCheck =
  /** "I don't know" → nothing to compare yet. */
  | { status: 'no-baseline'; goal: RaceEstimate }
  | {
      /** within-reach: goal pace is at or slower than the prediction. beyond: goal is faster. */
      status: 'within-reach' | 'beyond'
      predicted: RaceEstimate
      goal: RaceEstimate
      /** Seconds per km the goal is FASTER than the prediction (negative = slower). */
      gapSecPerKm: number
      /** Same gap as a percentage of the predicted pace. */
      gapPct: number
    }

/** What today's fitness predicts for `targetKm`, or null when we don't know. */
export function estimateRaceTime(baseline: Baseline, targetKm: number): number | null {
  switch (baseline.kind) {
    case 'unknown':
      return null
    case 'race':
      return predictTime(baseline.timeSec, distanceClass(baseline.distance).km, targetKm)
    case 'easyPace': {
      const fiveKPace = baseline.secPerKm - EASY_TO_5K_RACE_OFFSET_SEC_PER_KM
      return predictTime(timeFromPace(fiveKPace, 5), 5, targetKm)
    }
  }
}

/** Compares the goal pace with what current fitness predicts. Never blocks; only informs. */
export function realityCheck(input: {
  baseline: Baseline
  distanceClass: DistanceClassId
  goalPaceSecPerKm: number
}): RealityCheck {
  const km = distanceClass(input.distanceClass).km
  const goal = {
    timeSec: timeFromPace(input.goalPaceSecPerKm, km),
    paceSecPerKm: input.goalPaceSecPerKm,
  }
  const predictedTime = estimateRaceTime(input.baseline, km)
  if (predictedTime === null) return { status: 'no-baseline', goal }

  const predicted = { timeSec: predictedTime, paceSecPerKm: paceFromTime(predictedTime, km) }
  const gapSecPerKm = Math.round(predicted.paceSecPerKm - goal.paceSecPerKm)
  return {
    status: gapSecPerKm > 0 ? 'beyond' : 'within-reach',
    predicted,
    goal,
    gapSecPerKm,
    gapPct: Math.round((gapSecPerKm / predicted.paceSecPerKm) * 1000) / 10,
  }
}

/** How big the stretch is, so the copy can stay honest: a 3% gap and a 30% gap are not the same. */
export function ambitionLevel(gapPct: number): 'stretch' | 'long-term' {
  return gapPct > VERY_AMBITIOUS_GAP_PCT ? 'long-term' : 'stretch'
}
