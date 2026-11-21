import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { PROFILE_KEY, PROFILE_VERSION, THEME_KEY } from './storage/storage'
import { SAMPLE_PROFILE } from './test/fixtures'

function saveSampleProfile() {
  localStorage.setItem(
    PROFILE_KEY,
    JSON.stringify({ version: PROFILE_VERSION, profile: SAMPLE_PROFILE }),
  )
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))
const heading = (name: string | RegExp) => screen.getByRole('heading', { level: 1, name })
const pickIn = (group: string, option: string | RegExp) =>
  fireEvent.click(
    within(screen.getByRole('group', { name: group })).getByRole('radio', { name: option }),
  )

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('sends a new visitor straight to the avatar screen', () => {
    render(<App />)
    expect(heading('Pick your runner')).toBeInTheDocument()
    expect(
      within(screen.getByRole('group', { name: 'Pick your look' })).getAllByRole('radio'),
    ).toHaveLength(6)
  })

  it('switches to dark mode and remembers the choice', () => {
    render(<App />)
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('shows the saved profile on Home and navigates between sections', () => {
    saveSampleProfile()
    render(<App />)
    expect(heading('Training for the 10K')).toBeInTheDocument()
    const [planLink] = screen.getAllByRole('link', { name: 'Plan' })
    if (!planLink) throw new Error('Plan link not found')
    fireEvent.click(planLink)
    expect(heading('Plan')).toBeInTheDocument()
  })
})

describe('Onboarding', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('blocks Next until a choice is made, and explains why', () => {
    render(<App />)
    next()
    expect(screen.getByText('Pick a look to continue.')).toBeInTheDocument()
    expect(heading('Pick your runner')).toBeInTheDocument()
  })

  it('walks all 7 steps and saves the profile', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('radio', { name: /Look 2/ }))
    next()

    expect(heading('Choose your distance')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^Half marathon/ }))
    next()

    expect(heading('What kind of runner are you?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: /^Track Rat/ }))
    next()

    expect(heading('A bit about you')).toBeInTheDocument()
    pickIn('Which category should we compare you with?', 'Prefer not to say')
    fireEvent.change(screen.getByRole('textbox', { name: 'Age' }), { target: { value: '29' } })
    pickIn('Any current injuries?', 'No')
    next()

    expect(heading('When can you run?')).toBeInTheDocument()
    for (const day of ['Tuesday', 'Thursday', 'Saturday']) {
      fireEvent.click(screen.getByRole('checkbox', { name: day }))
    }
    // Saturday is suggested as the long-run day automatically.
    expect(screen.getByRole('combobox', { name: 'Long-run day' })).toHaveValue('sat')
    next()

    expect(heading('Where are you starting from?')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Longest run/ }), {
      target: { value: '9' },
    })
    pickIn('Can you run 30 minutes non-stop?', 'Yes')
    pickIn('Have you run regularly (most weeks) in the last 3 months?', 'Yes')
    fireEvent.click(screen.getByRole('radio', { name: /^My easy pace/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /Easy pace/ }), {
      target: { value: '6:20' },
    })
    next()

    expect(heading('Set your goal pace')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: /Goal pace/ }), {
      target: { value: '5:40' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))

    expect(heading('Training for the Half marathon')).toBeInTheDocument()
    expect(screen.getByText('Locked for 30 more days')).toBeInTheDocument()

    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')
    expect(saved.profile).toMatchObject({
      avatarId: 'look-2',
      distanceClass: 'half',
      persona: 'track-rat',
      sex: 'unspecified',
      age: 29,
      runDays: ['tue', 'thu', 'sat'],
      longRunDay: 'sat',
      baseline: { kind: 'easyPace', secPerKm: 380 },
      goalPaceSecPerKm: 340,
    })
  })

  it('keeps answers when going Back', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: /Look 4/ }))
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('radio', { name: /Look 4/ })).toBeChecked()
  })
})
