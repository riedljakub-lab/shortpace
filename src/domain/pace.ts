// Pace and time text <-> seconds. Pace is always seconds per kilometre.

/** "5:30" → 330. Returns null for anything that isn't m:ss. */
export function parsePace(input: string): number | null {
  const match = input.trim().match(/^(\d{1,2}):([0-5]\d)$/)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

/** 330 → "5:30" (rounded to whole seconds). */
export function formatPace(secPerKm: number): string {
  const total = Math.round(secPerKm)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** "25:30" → 1530, "1:05:30" → 3930. Returns null for anything else. */
export function parseDuration(input: string): number | null {
  const text = input.trim()
  const hms = text.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/)
  if (hms) return Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3])
  const ms = text.match(/^(\d{1,3}):([0-5]\d)$/)
  if (ms) return Number(ms[1]) * 60 + Number(ms[2])
  return null
}

/** 1530 → "25:30", 3930 → "1:05:30". */
export function formatDuration(totalSec: number): string {
  const total = Math.round(totalSec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Finish time for a distance at a given pace: 300 s/km over 10 km → 3000 s. */
export function timeFromPace(secPerKm: number, km: number): number {
  return secPerKm * km
}

/** Average pace for a time over a distance: 3000 s over 10 km → 300 s/km. */
export function paceFromTime(timeSec: number, km: number): number {
  if (km <= 0) throw new Error('Distance must be more than 0 km')
  return timeSec / km
}
