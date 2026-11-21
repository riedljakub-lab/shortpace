import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { THEME_KEY } from './storage/storage'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    window.location.hash = ''
  })

  it('shows the greeting and tagline', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Hello ShortPace' })).toBeInTheDocument()
    expect(screen.getByText('Shorter shorts. Faster pace.')).toBeInTheDocument()
  })

  it('switches to dark mode and remembers the choice', () => {
    render(<App />)
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked()

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('navigates between sections', () => {
    render(<App />)
    // Two navs exist (desktop + mobile); jsdom has no CSS, so both are present here.
    const [planLink] = screen.getAllByRole('link', { name: 'Plan' })
    if (!planLink) throw new Error('Plan link not found')
    fireEvent.click(planLink)
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeInTheDocument()
  })
})
