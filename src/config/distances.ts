// The four "classes". A runner picks one during onboarding.

export const DISTANCE_CLASSES = [
  { id: '5k', label: '5K', km: 5, blurb: 'Short and sharp. Great first goal.' },
  { id: '10k', label: '10K', km: 10, blurb: 'The classic. Speed meets stamina.' },
  { id: 'half', label: 'Half marathon', km: 21.0975, blurb: 'Long runs become your weekend.' },
  { id: 'marathon', label: 'Marathon', km: 42.195, blurb: 'The big one. Months of patience.' },
] as const

export type DistanceClassId = (typeof DISTANCE_CLASSES)[number]['id']
export const DISTANCE_CLASS_IDS = DISTANCE_CLASSES.map((d) => d.id)

export function distanceClass(id: DistanceClassId) {
  const found = DISTANCE_CLASSES.find((d) => d.id === id)
  if (!found) throw new Error(`Unknown distance class: ${id}`)
  return found
}
