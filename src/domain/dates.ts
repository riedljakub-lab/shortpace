// Dates are stored as plain local "YYYY-MM-DD" strings: no time zones, easy to read in JSON.

export const WEEKDAYS = [
  { id: 'mon', short: 'Mon', label: 'Monday' },
  { id: 'tue', short: 'Tue', label: 'Tuesday' },
  { id: 'wed', short: 'Wed', label: 'Wednesday' },
  { id: 'thu', short: 'Thu', label: 'Thursday' },
  { id: 'fri', short: 'Fri', label: 'Friday' },
  { id: 'sat', short: 'Sat', label: 'Saturday' },
  { id: 'sun', short: 'Sun', label: 'Sunday' },
] as const

export type Weekday = (typeof WEEKDAYS)[number]['id']
export const WEEKDAY_IDS = WEEKDAYS.map((d) => d.id)

export function weekdayLabel(id: Weekday): string {
  return WEEKDAYS.find((d) => d.id === id)?.label ?? id
}

/** Puts days in calendar order (Mon → Sun). */
export function sortWeekdays(days: readonly Weekday[]): Weekday[] {
  return WEEKDAY_IDS.filter((id) => days.includes(id))
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** Today's local date as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}

/** "2026-11-20" → "Fri 20 Nov". */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(y, m - 1, d))
}

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d))
}

/** "2026-11-30" + 2 → "2026-12-02". */
export function addDays(iso: string, days: number): string {
  const date = toUtc(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Which weekday a date falls on. */
export function weekdayOf(iso: string): Weekday {
  const jsDay = toUtc(iso).getUTCDay() // 0 = Sunday
  return WEEKDAY_IDS[(jsDay + 6) % 7] ?? 'mon'
}

/** The Monday of the week a date is in (weeks run Monday → Sunday). */
export function mondayOf(iso: string): string {
  return addDays(iso, -WEEKDAY_IDS.indexOf(weekdayOf(iso)))
}
