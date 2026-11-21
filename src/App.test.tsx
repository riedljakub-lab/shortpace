import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the greeting and tagline', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Hello ShortPace' })).toBeInTheDocument()
    expect(screen.getByText('Shorter shorts. Faster pace.')).toBeInTheDocument()
  })
})
