import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatPace,
  paceFromTime,
  parseDuration,
  parsePace,
  timeFromPace,
} from './pace'

describe('parsePace', () => {
  it('reads m:ss into seconds per km', () => {
    expect(parsePace('5:30')).toBe(330)
    expect(parsePace(' 4:05 ')).toBe(245)
    expect(parsePace('12:00')).toBe(720)
  })

  it('rejects anything that is not m:ss', () => {
    for (const bad of ['', '5', '5:3', '5:60', '5.30', 'abc', '-5:30', '100:00']) {
      expect(parsePace(bad), bad).toBeNull()
    }
  })
})

describe('formatPace', () => {
  it('writes seconds per km as m:ss', () => {
    expect(formatPace(330)).toBe('5:30')
    expect(formatPace(245)).toBe('4:05')
    expect(formatPace(299.6)).toBe('5:00')
  })

  it('round-trips with parsePace', () => {
    expect(formatPace(parsePace('6:07') ?? 0)).toBe('6:07')
  })
})

describe('parseDuration', () => {
  it('reads m:ss and h:mm:ss', () => {
    expect(parseDuration('25:30')).toBe(1530)
    expect(parseDuration('1:05:30')).toBe(3930)
    expect(parseDuration('125:00')).toBe(7500)
  })

  it('rejects broken times', () => {
    for (const bad of ['', '25', '1:5:30', '25:61', '1:60:00', 'x:yy']) {
      expect(parseDuration(bad), bad).toBeNull()
    }
  })
})

describe('formatDuration', () => {
  it('drops hours when there are none', () => {
    expect(formatDuration(1530)).toBe('25:30')
    expect(formatDuration(3930)).toBe('1:05:30')
    expect(formatDuration(3600)).toBe('1:00:00')
  })
})

describe('timeFromPace / paceFromTime', () => {
  it('converts between pace and finish time', () => {
    expect(timeFromPace(300, 10)).toBe(3000)
    expect(paceFromTime(3000, 10)).toBe(300)
    expect(formatDuration(timeFromPace(parsePace('5:00') ?? 0, 21.0975))).toBe('1:45:29')
  })

  it('refuses a zero distance', () => {
    expect(() => paceFromTime(100, 0)).toThrow()
  })
})
