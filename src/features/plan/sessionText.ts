import { formatKm } from '../../domain/pace'
import type { PlannedSession } from '../../domain/plan'

/** "11 km", "40 min", or '' for rest days. */
export function sessionTarget(session: PlannedSession): string {
  if (session.targetKm !== undefined) return `${formatKm(session.targetKm)} km`
  if (session.targetMin !== undefined) return `${session.targetMin} min`
  return ''
}
