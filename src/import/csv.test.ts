import { describe, expect, it } from 'vitest'
import {
  guessMapping,
  isRunActivity,
  parseCsvText,
  parseDateLoose,
  parseDurationLoose,
  parseNumberLoose,
} from './csv'

describe('parseCsvText', () => {
  it('reads Garmin’s English export, ignoring a BOM and blank lines', () => {
    const text =
      '\uFEFF' +
      '"Activity Type","Date","Distance","Time"\n"Running","2026-11-20 07:12:03","8.02","00:44:10"\n\n'
    const csv = parseCsvText(text)
    expect(csv.headers).toEqual(['Activity Type', 'Date', 'Distance', 'Time'])
    expect(csv.rows).toEqual([
      {
        'Activity Type': 'Running',
        Date: '2026-11-20 07:12:03',
        Distance: '8.02',
        Time: '00:44:10',
      },
    ])
  })

  it('auto-detects semicolons (Czech spreadsheets)', () => {
    const csv = parseCsvText('Datum;Vzdálenost;Čas\n20.11.2026;8,02;44:10\n')
    expect(csv.headers).toEqual(['Datum', 'Vzdálenost', 'Čas'])
    expect(csv.rows[0]).toEqual({ Datum: '20.11.2026', Vzdálenost: '8,02', Čas: '44:10' })
  })
})

describe('guessMapping', () => {
  it('finds Garmin Connect’s English columns', () => {
    const headers = [
      'Activity Type',
      'Date',
      'Favorite',
      'Title',
      'Distance',
      'Calories',
      'Time',
      'Avg HR',
      'Max HR',
      'Best Lap Time',
      'Moving Time',
    ]
    expect(guessMapping(headers)).toEqual({
      date: 'Date',
      distance: 'Distance',
      duration: 'Time', // not "Best Lap Time"
      activityType: 'Activity Type',
      avgHr: 'Avg HR',
      title: 'Title',
    })
  })

  it('handles variants, odd spacing and Czech', () => {
    expect(
      guessMapping([' start time ', 'Distance (km)', 'Elapsed Time', 'Average Heart Rate']),
    ).toEqual({
      date: ' start time ',
      distance: 'Distance (km)',
      duration: 'Elapsed Time',
      avgHr: 'Average Heart Rate',
    })
    expect(guessMapping(['Datum', 'Vzdálenost', 'Čas', 'Typ aktivity', 'Název'])).toEqual({
      date: 'Datum',
      distance: 'Vzdálenost',
      duration: 'Čas',
      activityType: 'Typ aktivity',
      title: 'Název',
    })
  })

  it('leaves unknown fields out (the user maps them)', () => {
    expect(guessMapping(['When', 'How far', 'How long'])).toEqual({})
  })
})

describe('messy values', () => {
  it('reads numbers with dots, decimal commas and thousands separators', () => {
    expect(parseNumberLoose('10.02')).toBe(10.02)
    expect(parseNumberLoose('10,02')).toBe(10.02)
    expect(parseNumberLoose(' 1,234.5 ')).toBe(1234.5)
    expect(parseNumberLoose('1.234,5')).toBe(1234.5)
    expect(parseNumberLoose('1,234')).toBe(1234)
    expect(parseNumberLoose('152')).toBe(152)
    for (const empty of ['--', '', '-', 'N/A', undefined])
      expect(parseNumberLoose(empty)).toBeNull()
    expect(parseNumberLoose('ten')).toBeNull()
  })

  it('reads times with or without hours and fractions', () => {
    expect(parseDurationLoose('00:44:10')).toBe(2650)
    expect(parseDurationLoose('44:10')).toBe(2650)
    expect(parseDurationLoose('1:02:03.6')).toBe(3724)
    expect(parseDurationLoose('1:2:3')).toBe(3723)
    expect(parseDurationLoose('--')).toBeNull()
    expect(parseDurationLoose('45 min')).toBeNull()
  })

  it('reads ISO, Czech and US dates', () => {
    expect(parseDateLoose('2026-11-20 07:12:03')).toBe('2026-11-20')
    expect(parseDateLoose('2026-11-20')).toBe('2026-11-20')
    expect(parseDateLoose('20.11.2026 7:12')).toBe('2026-11-20')
    expect(parseDateLoose('20. 11. 2026')).toBe('2026-11-20')
    expect(parseDateLoose('11/20/2026 07:12')).toBe('2026-11-20') // US
    expect(parseDateLoose('20/11/2026')).toBe('2026-11-20') // day first (20 > 12)
    expect(parseDateLoose('2026-02-30')).toBeNull() // no such day
    expect(parseDateLoose('yesterday')).toBeNull()
  })

  it('recognises running activities', () => {
    for (const run of ['Running', 'Treadmill Running', 'Trail Running', 'Track Running', 'Běh']) {
      expect(isRunActivity(run), run).toBe(true)
    }
    for (const other of ['Cycling', 'Strength Training', 'Walking', 'Pool Swim']) {
      expect(isRunActivity(other), other).toBe(false)
    }
  })
})
