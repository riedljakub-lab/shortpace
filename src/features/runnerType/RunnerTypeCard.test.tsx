import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { addDays } from '../../domain/dates'
import type { Profile, Run } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

// SAMPLE_PROFILE picked the Trail Goat persona.
function openHome(runs: Run[], profile: Profile = SAMPLE_PROFILE) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile }))
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = '#/'
  render(<App />)
}

/** `count` runs every other day; steady pace unless `over` changes it. */
const runs = (count: number, over: (i: number) => Partial<Run> = () => ({})) =>
  Array.from({ length: count }, (_, i) =>
    sampleRun({
      id: `r${i}`,
      date: addDays('2026-10-20', i * 2),
      distanceKm: 6,
      durationSec: 6 * (330 + (i % 3) * 3),
      ...over(i),
    }),
  )

const card = () => screen.getByRole('region', { name: 'Runner type reveal' })

describe('Runner type reveal on Home', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 28, 12))
  })
  afterEach(() => vi.useRealTimers())

  it('stays locked until 8 runs, showing progress', () => {
    openHome(runs(3))
    expect(card()).toHaveTextContent('Unlocks after 8 runs. You’ve logged 3.')
    expect(within(card()).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
    expect(within(card()).queryByRole('button')).not.toBeInTheDocument()
  })

  it('reveals the type with the facts behind it', () => {
    openHome(runs(10))
    fireEvent.click(within(card()).getByRole('button', { name: 'Reveal my runner type' }))

    const verdict = within(card()).getByText(/You picked/)
    expect(verdict).toHaveTextContent('You picked Trail Goat. Your data says: Diesel.')
    expect(verdict).toHaveFocus()
    expect(card()).toHaveTextContent('Slow to start, impossible to stop.')
    expect(card()).toHaveTextContent(/Your pace barely changes/)
    expect(card()).toHaveTextContent('10 runs logged, about 3.7 a week.')

    // The rules are right there, in plain words.
    fireEvent.click(within(card()).getByText('How we decide'))
    expect(card()).toHaveTextContent(/Weekend Warrior: at least 60% of runs on Saturday or Sunday/)
    expect(card()).toHaveTextContent('Diesel: your pace varies less than 7% from run to run.')
  })

  it('says so when your data agrees with the persona you picked', () => {
    openHome(
      runs(10, (i) => ({
        notes: i < 5 ? 'Trail Running' : 'Road run',
        durationSec: 6 * (300 + i * 15),
      })),
    )
    fireEvent.click(within(card()).getByRole('button', { name: 'Reveal my runner type' }))
    expect(within(card()).getByText(/You picked/)).toHaveTextContent(
      'You picked Trail Goat. Your data agrees: Trail Goat.',
    )
  })
})
