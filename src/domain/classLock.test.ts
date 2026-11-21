import { describe, expect, it } from 'vitest'
import { classLockStatus } from './classLock'
import { daysBetween, sortWeekdays, todayIso } from './dates'

describe('classLockStatus (30-day lock)', () => {
  it('is locked on the day the class is picked', () => {
    expect(classLockStatus('2026-11-21', '2026-11-21')).toEqual({ locked: true, daysLeft: 30 })
  })

  it('is still locked on day 29', () => {
    expect(classLockStatus('2026-11-01', '2026-11-30')).toEqual({ locked: true, daysLeft: 1 })
  })

  it('unlocks on day 30 and stays unlocked', () => {
    expect(classLockStatus('2026-11-01', '2026-12-01')).toEqual({ locked: false, daysLeft: 0 })
    expect(classLockStatus('2026-01-01', '2026-12-01')).toEqual({ locked: false, daysLeft: 0 })
  })
})

describe('dates', () => {
  it('counts days across months and leap years', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2026-11-21', '2026-11-20')).toBe(-1)
  })

  it('formats a local date as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('sorts weekdays Monday first', () => {
    expect(sortWeekdays(['sun', 'mon', 'thu'])).toEqual(['mon', 'thu', 'sun'])
  })
})
