import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import messy from '../../../fixtures/garmin-english-messy.csv?raw'
import App from '../../App'
import type { Run } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

function openImport(runs: Run[] = []) {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ version: PROFILE_VERSION, profile: SAMPLE_PROFILE }),
  )
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = '#/import'
  render(<App />)
}

function chooseFile(text: string, name = 'Activities.csv') {
  fireEvent.change(screen.getByLabelText('Choose a Garmin CSV export'), {
    target: { files: [new File([text], name, { type: 'text/csv' })] },
  })
}

const savedRuns = (): Run[] => JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs

describe('Garmin import screen', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('maps columns, previews, imports and reports what was skipped', async () => {
    // One run is already logged by hand: the import must skip it.
    openImport([sampleRun({ id: 'mine', date: '2026-11-16', distanceKm: 8, durationSec: 2640 })])
    expect(screen.getByRole('heading', { name: 'Export your activities' })).toBeInTheDocument()

    chooseFile(messy)
    expect(await screen.findByRole('heading', { name: '1. Check the columns' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Date' })).toHaveValue('Date')
    expect(screen.getByRole('combobox', { name: 'Time' })).toHaveValue('Time')
    expect(screen.getByRole('combobox', { name: 'Activity type (optional)' })).toHaveValue(
      'Activity Type',
    )

    expect(screen.getByText(/ready to import/)).toHaveTextContent(
      '6 runs ready to import, 7 rows will be skipped.',
    )
    const skipped = screen.getByRole('list', { name: 'Skipped rows' })
    expect(skipped).toHaveTextContent('Not a run (rows 4, 6)')
    expect(skipped).toHaveTextContent('Already in your log (row 12)')

    fireEvent.click(screen.getByRole('button', { name: 'Import 6 runs' }))
    expect(screen.getByRole('heading', { name: 'Imported 6 runs' })).toBeInTheDocument()
    expect(savedRuns()).toHaveLength(7)
    expect(savedRuns().filter((r) => r.source === 'garmin')).toHaveLength(6)
  })

  it('needs date, distance and time mapped before it can import', async () => {
    openImport()
    chooseFile(messy)
    const date = await screen.findByRole('combobox', { name: 'Date' })
    fireEvent.change(date, { target: { value: '' } })
    expect(screen.getByText(/Pick the columns for Date to see the preview/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nothing to import' })).toBeDisabled()
  })

  it('converts miles when asked', async () => {
    openImport()
    chooseFile('Date,Distance,Time\n2026-11-20,3.11,00:25:00\n')
    await screen.findByRole('heading', { name: '2. Preview' })
    fireEvent.click(screen.getByRole('radio', { name: 'Miles' }))
    const table = screen.getByRole('table', { name: /Runs to import/ })
    expect(within(table).getByText('5.01 km')).toBeInTheDocument()
  })

  it('says so when the file has nothing readable', async () => {
    openImport()
    chooseFile('just some text without rows')
    expect(await screen.findByText(/This file has no rows we can read/)).toBeInTheDocument()
  })
})
