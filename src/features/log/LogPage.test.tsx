import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

function openLog(runs = [] as ReturnType<typeof sampleRun>[]) {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ version: PROFILE_VERSION, profile: SAMPLE_PROFILE }),
  )
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs }))
  window.location.hash = '#/log'
  render(<App />)
}

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
const savedRuns = () => JSON.parse(localStorage.getItem(RUNS_KEY) ?? '{}').runs

describe('Log a run', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('saves a run, shows the pace and lists it', () => {
    openLog()
    expect(screen.getByText('No runs yet. Log your first one above.')).toBeInTheDocument()

    type('Date', '2026-11-20')
    type('Distance (km)', '8,5')
    type(/^Time/, '47:00')
    expect(screen.getByText('5:32 /km')).toBeInTheDocument() // live pace
    fireEvent.click(screen.getByRole('radio', { name: /^Long/ }))
    fireEvent.click(screen.getByRole('radio', { name: 'Effort 6 of 10' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save run' }))

    expect(screen.getByRole('status')).toHaveTextContent('Saved: 8.5 km in 47:00 (5:32 /km).')
    const list = screen.getByRole('list', { name: 'Your runs' })
    expect(within(list).getByText('5:32 /km')).toBeInTheDocument()
    expect(within(list).getByText('8.5 km')).toBeInTheDocument()
    expect(savedRuns()).toHaveLength(1)
    expect(savedRuns()[0]).toMatchObject({
      distanceKm: 8.5,
      durationSec: 2820,
      type: 'long',
      effort: 6,
    })

    // The form is ready for the next run.
    expect(screen.getByLabelText('Distance (km)')).toHaveValue('')
  })

  it('explains what is missing and focuses the first problem', () => {
    openLog()
    fireEvent.click(screen.getByRole('button', { name: 'Save run' }))
    expect(screen.getByText('Enter the distance in km, like 8 or 8.5.')).toBeInTheDocument()
    expect(screen.getByText('Rate how hard it felt, from 1 to 10.')).toBeInTheDocument()
    expect(screen.getByLabelText('Distance (km)')).toHaveFocus()
    expect(savedRuns()).toEqual([])
  })

  it('opens "More details" when an optional field has a problem', () => {
    openLog()
    type('Distance (km)', '5')
    type(/^Time/, '25:00')
    fireEvent.click(screen.getByRole('radio', { name: 'Effort 7 of 10' }))
    fireEvent.click(screen.getByText('More details (optional)'))
    type(/Km splits/, '5:00, quick')
    fireEvent.click(screen.getByText('More details (optional)')) // close it again
    fireEvent.click(screen.getByRole('button', { name: 'Save run' }))
    expect(screen.getByLabelText(/Km splits/)).toHaveFocus()
  })

  it('deletes a run only after confirming', () => {
    openLog([sampleRun({ id: 'keep-me' })])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const del = screen.getByRole('button', { name: /^Delete run:/ })

    fireEvent.click(del)
    expect(savedRuns()).toHaveLength(1)

    fireEvent.click(del)
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(savedRuns()).toEqual([])
    expect(screen.getByText('No runs yet. Log your first one above.')).toBeInTheDocument()
  })
})
