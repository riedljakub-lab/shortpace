import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
// Load the lazily-loaded page up front, so its first render doesn't race the test's timeout.
import './DashboardPage'
import { addDays } from '../../domain/dates'
import type { Profile, Run } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

// Goal 5:15/km (315 s), women's 10K, started 7 Sep.
const profile: Profile = { ...SAMPLE_PROFILE, classChosenOn: '2026-09-07' }

function openDashboard(runs: Run[]) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile }))
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = '#/dashboard'
  render(<App />)
}

/** `count` easy 8 km runs every other day ending on `last`, at `pace` s/km. */
const series = (last: string, count: number, pace: number, over: Partial<Run> = {}) =>
  Array.from({ length: count }, (_, i) => {
    const date = addDays(last, -2 * (count - 1 - i))
    return sampleRun({ id: `${date}-${pace}`, date, distanceKm: 8, durationSec: 8 * pace, ...over })
  })

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 1, 12)) // Sun 1 Nov 2026
  })
  afterEach(() => vi.useRealTimers())

  it('asks for a couple of runs before showing charts', async () => {
    openDashboard([sampleRun({ date: '2026-10-30' })])
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText(/Log at least 2 runs to see your charts/)).toBeInTheDocument()
  })

  it('shows level, ghost, gap and every chart, each with a table view', async () => {
    openDashboard(series('2026-11-01', 12, 330))
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    expect(screen.getByRole('progressbar', { name: 'Progress to next level' })).toBeInTheDocument()
    const ghost = screen.getByRole('region', { name: 'Record Ghost' })
    expect(ghost).toHaveTextContent(/km behind/)
    expect(ghost).toHaveTextContent('31:05') // women's 10K record ghost, never a name
    expect(screen.getByRole('region', { name: /Gap to goal pace/ })).toHaveTextContent(
      '15 s/km slower',
    )

    for (const title of [
      'Pace vs goal',
      'Gap to goal, trend',
      'Where you’re missing: by run type',
      'Weekly km',
      'Longest run vs the spike limit',
    ]) {
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument()
    }
    // No splits logged → a helpful hint instead of an empty chart.
    expect(screen.getByText(/Add km splits under “More details”/)).toBeInTheDocument()
  })

  it('switches a chart to its table and back', async () => {
    openDashboard(series('2026-11-01', 4, 330))
    const card = await screen.findByRole('region', { name: 'Weekly km' })
    const toggle = within(card).getByRole('button', { name: 'Show Weekly km as a table' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const table = within(card).getByRole('table', { name: 'Weekly km' })
    expect(within(table).getAllByRole('row')).toHaveLength(13) // header + 12 weeks
    expect(table).toHaveTextContent('26 Oct')

    fireEvent.click(toggle)
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the splits chart when runs have km splits', async () => {
    openDashboard(series('2026-11-01', 3, 330, { splitsSecPerKm: [320, 325, 340] }))
    expect(
      await screen.findByRole('region', { name: 'Where you’re missing: by kilometre' }),
    ).toBeInTheDocument()
  })

  it('explains regress honestly, with likely reasons', async () => {
    // Easy runs at 5:39 for 4 weeks, then 5:59 at effort 8 → slower AND tired.
    openDashboard([
      ...series('2026-10-04', 12, 339, { type: 'easy', effort: 4 }),
      ...series('2026-11-01', 8, 359, { type: 'easy', effort: 8 }),
    ])
    const regress = await screen.findByRole('region', { name: 'Why your shorts grew back' })
    expect(regress).toHaveTextContent('about 20 s/km slower')
    expect(regress).toHaveTextContent('That usually means tired, not slower.')
  })
})
