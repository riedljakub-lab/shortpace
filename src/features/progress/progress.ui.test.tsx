import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { addDays } from '../../domain/dates'
import type { Profile, Run } from '../../domain/types'
import { LAST_SEEN_LEVEL_KEY, PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

const profile: Profile = {
  ...SAMPLE_PROFILE,
  classChosenOn: '2026-09-07',
  baseline: { kind: 'race', distance: '5k', timeSec: 1650 },
}

function series(lastDate: string, count: number, pace: number): Run[] {
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(lastDate, -2 * (count - 1 - i))
    return sampleRun({ id: `${date}-${pace}`, date, distanceKm: 8, durationSec: 8 * pace })
  })
}

function openHome(runs: Run[], p: Profile = profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile: p }))
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = '#/'
  render(<App />)
}

const setToday = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  vi.setSystemTime(new Date(y, m - 1, d, 12))
}

describe('Shorts progression on Home', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
  })
  afterEach(() => vi.useRealTimers())

  it('starts in cargo shorts and shows what the next level needs', () => {
    setToday('2026-09-07')
    openHome([])
    expect(screen.getByRole('heading', { name: 'Level 1 · Cargo shorts' })).toBeInTheDocument()
    expect(screen.getByText('30 cm inseam')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Next: Basketball baggies (25 cm)' }),
    ).toBeInTheDocument()
    const checklist = screen.getByRole('list', { name: 'What the next level needs' })
    expect(checklist).toHaveTextContent('XP earned: 0 (need 100)')
    // Nothing to celebrate on day one.
    expect(screen.queryByText(/Level up!/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LAST_SEEN_LEVEL_KEY)).toBe('1')
  })

  it('celebrates a new level once, then remembers it', () => {
    setToday('2026-10-04')
    localStorage.setItem(LAST_SEEN_LEVEL_KEY, '1')
    openHome(series('2026-10-04', 12, 339))

    const heading = screen.getByRole('heading', { name: 'Level up! Basketball baggies' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('30 cm')).toHaveClass('line-through')
    expect(screen.getByText('25 cm')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Level 2 · Basketball baggies' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Nice!' }))
    expect(screen.queryByText(/Level up!/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LAST_SEEN_LEVEL_KEY)).toBe('2')
  })

  it('shows the cargo pocket message kindly when easy runs get slower', () => {
    setToday('2026-11-01')
    localStorage.setItem(LAST_SEEN_LEVEL_KEY, '2')
    openHome([...series('2026-10-04', 12, 339), ...series('2026-11-01', 8, 359)])

    expect(screen.getByRole('heading', { name: 'Level 1 · Cargo shorts' })).toBeInTheDocument()
    expect(screen.getByText('Cargo pocket alert.')).toBeInTheDocument()
    expect(screen.getByText(/about 20 s\/km slower/)).toBeInTheDocument()
    expect(screen.getByText(/the scissors come back/)).toBeInTheDocument()
    // Going down is never "celebrated", and coming back up will be.
    expect(screen.queryByText(/Level up!/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LAST_SEEN_LEVEL_KEY)).toBe('1')
  })
})
