import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { Profile, Run } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

// SAMPLE_PROFILE: longest run in the last 30 days = 8 km, onboarded Sat 21 Nov 2026.
function open(hash: string, runs: Run[] = [], profile: Profile = SAMPLE_PROFILE) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile }))
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = hash
  render(<App />)
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe('Overtraining guard in the app', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0)) // Sat 21 Nov 2026
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('warns while typing a run that is a big jump, but still lets you save it', () => {
    open('#/log')
    type('Distance (km)', '8.8') // exactly +10%: fine
    expect(screen.queryByText('That’s a big jump.')).not.toBeInTheDocument()

    type('Distance (km)', '12')
    expect(screen.getByText('That’s a big jump.')).toBeInTheDocument()
    expect(screen.getByText(/12 km is 50% longer than your longest run/)).toBeInTheDocument()

    type(/^Time/, '1:10:00')
    fireEvent.click(screen.getByRole('radio', { name: 'Effort 6 of 10' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save run' }))

    expect(screen.getByRole('status')).toHaveTextContent('Saved: 12 km')
    expect(screen.getByRole('status')).toHaveTextContent('Big jump.')
    const list = screen.getByRole('list', { name: 'Your runs' })
    expect(within(list).getByText(/Big jump/)).toBeInTheDocument()
  })

  it('recommends a rest day after two tough easy runs, with no way to dismiss or buy it away', () => {
    open('#/', [
      sampleRun({ id: 'a', date: '2026-11-19', type: 'easy', effort: 8, distanceKm: 5 }),
      sampleRun({ id: 'b', date: '2026-11-20', type: 'easy', effort: 9, distanceKm: 5 }),
    ])
    const alert = screen.getByRole('region', { name: 'Rest day recommended' })
    expect(alert).toHaveTextContent('Time for a rest day.')
    expect(alert).toHaveTextContent('felt like 8/10 or harder (Thu, Fri)')
    expect(alert).toHaveTextContent('Take today off.')
    expect(within(alert).queryAllByRole('button')).toEqual([])
    expect(within(alert).queryAllByRole('link')).toEqual([])
  })

  it('shows the rest-day advice on the Plan and Log pages too', () => {
    const tough = [
      sampleRun({ id: 'a', date: '2026-11-19', type: 'easy', effort: 8, distanceKm: 5 }),
      sampleRun({ id: 'b', date: '2026-11-20', type: 'easy', effort: 8, distanceKm: 5 }),
    ]
    open('#/plan', tough)
    expect(screen.getByRole('region', { name: 'Rest day recommended' })).toBeInTheDocument()
  })

  it('says nothing when easy runs feel easy', () => {
    open('#/', [
      sampleRun({ id: 'a', date: '2026-11-19', type: 'easy', effort: 4 }),
      sampleRun({ id: 'b', date: '2026-11-20', type: 'easy', effort: 5 }),
    ])
    expect(screen.queryByRole('region', { name: 'Rest day recommended' })).not.toBeInTheDocument()
  })

  it('never plans a long run that trips its own spike guard', () => {
    // Longest recent run 1 km → planned long run 1 km (+10% rounded down), no warning.
    open('#/plan', [], { ...SAMPLE_PROFILE, longestRunKm30d: 1 })
    const saturday = within(screen.getByRole('list', { name: 'Week 1 sessions' })).getAllByRole(
      'listitem',
    )[5]
    expect(saturday).toHaveTextContent('Long run · 1 km')
    expect(saturday).not.toHaveTextContent('Big jump.')
  })
})
