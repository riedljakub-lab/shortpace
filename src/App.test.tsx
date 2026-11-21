import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { PROFILE_KEY, PROFILE_VERSION, THEME_KEY } from './storage/storage'
import { SAMPLE_PROFILE } from './test/fixtures'
import { SAFETY_LINE } from './config/safety'

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

interface Answers {
  distance?: RegExp
  canRun30Min?: 'Yes' | 'No'
  regular?: 'Yes' | 'No'
  baseline?: 'easy' | 'race' | 'unknown'
  goal?: string
}

/** Clicks through onboarding like a user, stopping on the Reality check step. */
function goToRealityCheck({
  distance = /^Half marathon/,
  canRun30Min = 'Yes',
  regular = 'Yes',
  baseline = 'easy',
  goal = '5:40',
}: Answers = {}) {
  fireEvent.click(screen.getByRole('radio', { name: /Look 2/ }))
  next()

  expect(heading('Choose your distance')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: distance }))
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
  fireEvent.change(screen.getByRole('textbox', { name: /Longest run/ }), { target: { value: '9' } })
  pickIn('Can you run 30 minutes non-stop?', canRun30Min)
  pickIn('Have you run regularly (most weeks) in the last 3 months?', regular)
  if (baseline === 'easy') {
    fireEvent.click(screen.getByRole('radio', { name: /^My easy pace/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /Easy pace/ }), {
      target: { value: '6:20' },
    })
  } else if (baseline === 'race') {
    fireEvent.click(screen.getByRole('radio', { name: /^A recent race time/ }))
    fireEvent.change(screen.getByRole('textbox', { name: /Finish time/ }), {
      target: { value: '25:00' },
    })
  } else {
    fireEvent.click(screen.getByRole('radio', { name: /^I don’t know/ }))
  }
  next()

  expect(heading('Set your goal pace')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: /Goal pace/ }), { target: { value: goal } })
  next()

  expect(heading('Reality check')).toBeInTheDocument()
}

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

  it('walks all 8 steps and saves the profile', () => {
    render(<App />)
    goToRealityCheck()

    // 6:20 easy → ~5:05 5K race pace → predicts ~5:33/km for the half. Goal 5:40 is within reach.
    expect(screen.getByText('Within reach.')).toBeInTheDocument()
    expect(screen.queryByText(SAFETY_LINE)).not.toBeInTheDocument()
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

  it('warns when the goal is faster than the prediction, but lets you keep it', () => {
    render(<App />)
    // 25:00 5K predicts 52:07 for 10K (5:13/km). Goal 5:00/km is 13 s/km faster.
    goToRealityCheck({ distance: /^10K/, baseline: 'race', goal: '5:00' })
    expect(screen.getByText('Ambitious goal.')).toBeInTheDocument()
    expect(screen.getByText(/13 s\/km \(4.2%\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(heading('Training for the 10K')).toBeInTheDocument()
  })

  it('gives a novice marathoner a strong warning, a path, and the safety line', () => {
    render(<App />)
    goToRealityCheck({
      distance: /^Marathon/,
      canRun30Min: 'No',
      baseline: 'unknown',
      goal: '7:00',
    })

    expect(screen.getByText('A marathon is a big first goal.')).toBeInTheDocument()
    expect(screen.getByText('Base phase first.')).toBeInTheDocument()
    expect(screen.getByText(SAFETY_LINE)).toBeInTheDocument()
    const path = screen.getByRole('list')
    expect(
      within(path)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['5K', '→10K', '→Half marathon', '→Marathon'])

    // One tap follows the advice; the warning goes away, the safety line stays (still a novice).
    fireEvent.click(screen.getByRole('button', { name: 'Switch to 5K instead' }))
    expect(screen.queryByText('A marathon is a big first goal.')).not.toBeInTheDocument()
    expect(screen.getByText('Your goal for the 5K')).toBeInTheDocument()
    expect(screen.getByText(SAFETY_LINE)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(heading('Training for the 5K')).toBeInTheDocument()
  })

  it('lets a novice keep the marathon', () => {
    render(<App />)
    goToRealityCheck({ distance: /^Marathon/, regular: 'No', baseline: 'unknown', goal: '7:00' })
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }))
    expect(heading('Training for the Marathon')).toBeInTheDocument()
  })

  it('keeps answers when going Back', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('radio', { name: /Look 4/ }))
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('radio', { name: /Look 4/ })).toBeChecked()
  })
})

describe('Reality check copy', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('is candid about very big gaps', () => {
    render(<App />)
    // 25:00 5K → 52:07 10K (5:13/km). Goal 4:00/km is 73 s/km (23.3%) faster.
    goToRealityCheck({ distance: /^10K/, baseline: 'race', goal: '4:00' })
    expect(screen.getByText('That’s a long-term goal.')).toBeInTheDocument()
    expect(screen.queryByText('Ambitious goal.')).not.toBeInTheDocument()
  })
})
