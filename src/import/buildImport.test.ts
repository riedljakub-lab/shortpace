import { describe, expect, it } from 'vitest'
// A synthetic, made-up Garmin export with the real English headers and lots of mess.
import messy from '../../fixtures/garmin-english-messy.csv?raw'
import { sampleRun } from '../test/fixtures'
import { buildImport, summariseSkipped } from './buildImport'
import { guessMapping, parseCsvText } from './csv'

const ctx = () => {
  let n = 0
  return { today: '2026-11-21', now: new Date('2026-11-21T10:00:00Z'), newId: () => `imp-${++n}` }
}

describe('Garmin import of a messy export', () => {
  const csv = parseCsvText(messy)
  const mapping = guessMapping(csv.headers)
  // One run is already in the log (same date, distance and time).
  const existing = [sampleRun({ id: 'mine', date: '2026-11-16', distanceKm: 8, durationSec: 2640 })]
  const plan = buildImport(csv, { mapping, unit: 'km' }, existing, ctx())

  it('maps the English Garmin columns automatically', () => {
    expect(mapping).toMatchObject({
      date: 'Date',
      distance: 'Distance',
      duration: 'Time',
      activityType: 'Activity Type',
    })
  })

  it('imports only the real, new runs', () => {
    expect(plan.runs.map((r) => [r.date, r.distanceKm, r.durationSec])).toEqual([
      ['2026-11-02', 6.01, 2180],
      ['2026-11-04', 5, 1625],
      ['2026-11-07', 5, 1481],
      ['2026-11-09', 14.2, 5190],
      ['2026-11-11', 7.3, 2952],
      ['2026-11-14', 5.8, 2138],
    ])
    expect(plan.runs.every((r) => r.source === 'garmin')).toBe(true)
  })

  it('guesses run types from titles and distance, with matching estimated effort', () => {
    const types = Object.fromEntries(plan.runs.map((r) => [r.notes, [r.type, r.effort]]))
    expect(types).toEqual({
      'Morning Run': ['easy', 4],
      'Treadmill Intervals': ['fast', 7],
      'Prague parkrun': ['race', 9],
      'Long Sunday Run': ['long', 6],
      'Hill repeats': ['fast', 7],
      'Easy jog': ['easy', 4],
    })
  })

  it('keeps heart rate when present and skips "--"', () => {
    expect(plan.runs[0]?.avgHeartRate).toBe(148)
    expect(plan.runs.find((r) => r.notes === 'Easy jog')?.avgHeartRate).toBeUndefined()
  })

  it('reports every skipped row with a reason a person understands', () => {
    expect(plan.skipped).toEqual([
      { row: 4, reason: 'Not a run (Cycling)' },
      { row: 6, reason: 'Not a run (Strength Training)' },
      { row: 8, reason: 'Appears twice in this file' },
      { row: 10, reason: 'Couldn’t read the time “--”' },
      { row: 12, reason: 'Already in your log' },
      { row: 13, reason: 'Date is in the future' },
      { row: 14, reason: 'Pace looks impossible (0:44 /km)' },
    ])
    expect(summariseSkipped(plan.skipped)).toEqual([
      { reason: 'Not a run', rows: [4, 6] },
      { reason: 'Appears twice in this file', rows: [8] },
      { reason: 'Couldn’t read the time “--”', rows: [10] },
      { reason: 'Already in your log', rows: [12] },
      { reason: 'Date is in the future', rows: [13] },
      { reason: 'Pace looks impossible (0:44 /km)', rows: [14] },
    ])
  })

  it('skips everything as duplicates on a second import of the same file', () => {
    const again = buildImport(csv, { mapping, unit: 'km' }, [...existing, ...plan.runs], ctx())
    expect(again.runs).toEqual([])
    expect(again.skipped.filter((s) => s.reason === 'Already in your log')).toHaveLength(8) // 6 imported + the in-file duplicate + the one you logged by hand
  })
})

describe('other exports', () => {
  it('reads a Czech semicolon export with decimal commas', () => {
    const csv = parseCsvText(
      'Typ aktivity;Datum;Název;Vzdálenost;Čas\nBěh;20.11.2026;Večerní běh;8,02;0:44:10\n',
    )
    const plan = buildImport(csv, { mapping: guessMapping(csv.headers), unit: 'km' }, [], ctx())
    expect(plan.runs).toMatchObject([
      { date: '2026-11-20', distanceKm: 8.02, durationSec: 2650, notes: 'Večerní běh' },
    ])
  })

  it('converts miles', () => {
    const csv = parseCsvText('Date,Distance,Time\n2026-11-20,3.11,00:25:00\n')
    const plan = buildImport(csv, { mapping: guessMapping(csv.headers), unit: 'mi' }, [], ctx())
    expect(plan.runs[0]?.distanceKm).toBe(5.01)
  })

  it('treats every row as a run when there is no activity-type column', () => {
    const csv = parseCsvText('Date,Distance,Time\n2026-11-20,5,00:30:00\n')
    expect(
      buildImport(csv, { mapping: guessMapping(csv.headers), unit: 'km' }, [], ctx()).runs,
    ).toHaveLength(1)
  })

  it('explains unreadable values with what it saw', () => {
    const csv = parseCsvText('Date,Distance,Time\nsoon,5,00:30:00\n2026-11-20,far,00:30:00\n')
    const plan = buildImport(csv, { mapping: guessMapping(csv.headers), unit: 'km' }, [], ctx())
    expect(plan.skipped.map((s) => s.reason)).toEqual([
      'Couldn’t read the date “soon”',
      'Couldn’t read the distance “far”',
    ])
  })
})
