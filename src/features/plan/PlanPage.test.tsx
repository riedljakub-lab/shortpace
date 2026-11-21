import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import type { Profile } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION } from '../../storage/storage'
import { SAMPLE_PROFILE } from '../../test/fixtures'

// SAMPLE_PROFILE: experienced Trail Goat, 10K, runs Tue/Thu/Sat, long run Saturday,
// longest run 8 km, started Sat 21 Nov 2026.
function open(hash: string, profile: Profile = SAMPLE_PROFILE) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile }))
  window.location.hash = hash
  render(<App />)
}

describe('Plan page', () => {
  beforeEach(() => {
    localStorage.clear()
    // Freeze "today" so the test gives the same answer on any day CI runs it.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0)) // Sat 21 Nov 2026
  })
  afterEach(() => vi.useRealTimers())

  it('shows the draft label and this week’s 7 days', () => {
    open('#/plan')
    expect(screen.getByText('Draft plan, coach review pending')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Week 1 · Build phase' })).toBeInTheDocument()

    const days = within(screen.getByRole('list', { name: 'Week 1 sessions' })).getAllByRole(
      'listitem',
    )
    expect(days).toHaveLength(7)
    // Trail Goat's quality session is hills, placed far from the Saturday long run.
    expect(days[1]).toHaveTextContent('Hill repeats')
    expect(days[3]).toHaveTextContent('Easy run · 40 min')
    // Long run: 8 km recent longest + 10% = 8.8 → rounded down to 8.5 km.
    expect(days[5]).toHaveTextContent('Long run · 8.5 km')
    expect(days[5]).toHaveAttribute('aria-current', 'date')
    expect(days[6]).toHaveTextContent('Rest day')
  })

  it('looks ahead week by week', () => {
    open('#/plan')
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(screen.getByRole('heading', { name: 'Week 2 · Build phase' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByRole('heading', { name: 'Week 1 · Build phase' })).toBeInTheDocument()
  })

  it('starts a novice in the base phase with easy running only', () => {
    open('#/plan', { ...SAMPLE_PROFILE, canRun30Min: false })
    expect(screen.getByRole('heading', { name: 'Week 1 · Base phase' })).toBeInTheDocument()
    expect(screen.getByText(/Harder sessions start in week 5/)).toBeInTheDocument()
    expect(screen.queryByText('Hill repeats')).not.toBeInTheDocument()
  })

  it('shows today’s session on Home', () => {
    open('#/')
    const today = screen.getByRole('region', { name: 'Today' })
    expect(today).toHaveTextContent('Long run · 8.5 km')
    expect(within(today).getByRole('link', { name: 'See your week' })).toBeInTheDocument()
  })
})
