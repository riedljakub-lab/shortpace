import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { addDays } from '../../domain/dates'
import { progression } from '../../domain/levels'
import type { Profile, Run } from '../../domain/types'
import { PROFILE_KEY, PROFILE_VERSION, RUNS_KEY, WALLET_KEY } from '../../storage/storage'
import { SAMPLE_PROFILE, sampleRun } from '../../test/fixtures'

const TODAY = '2026-10-10' // 33 days after the start: the 30-day lock is over
const profile: Profile = { ...SAMPLE_PROFILE, classChosenOn: '2026-09-07' }

/** A month of running every other day: plenty of coins. */
const runs: Run[] = Array.from({ length: 16 }, (_, i) =>
  sampleRun({ id: `r${i}`, date: addDays('2026-09-08', i * 2), distanceKm: 6, durationSec: 2100 }),
)

function openShop(p: Profile = profile, r: Run[] = runs) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify({ version: PROFILE_VERSION, profile: p }))
  localStorage.setItem(RUNS_KEY, JSON.stringify({ version: 1, runs: r }))
  window.location.hash = '#/shop'
  render(<App />)
}

const earned = (p: Profile = profile, r: Run[] = runs) => progression(p, r, TODAY).coins
const card = (name: string) =>
  screen.getByText(name, { selector: 'p.font-semibold' }).closest('li') as HTMLElement
const status = () => screen.getByRole('status')

describe('Shop', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 10, 12))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows your balance and lets you buy and wear shorts', () => {
    const coins = earned()
    expect(coins).toBeGreaterThan(140) // enough for every purchase in these tests
    openShop()
    expect(screen.getByText(`${coins} coins`)).toBeInTheDocument()
    expect(within(card('Charcoal')).getByText('Wearing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Buy Cobalt for 40 coins' }))
    expect(status()).toHaveTextContent('Cobalt shorts bought. You’re wearing them.')
    expect(screen.getByText(`${coins - 40} coins`)).toBeInTheDocument()
    expect(within(card('Cobalt')).getByText('Wearing')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Wear Charcoal' }))
    expect(status()).toHaveTextContent('Now wearing Charcoal.')
    const saved = JSON.parse(localStorage.getItem(WALLET_KEY) ?? '{}').wallet
    expect(saved).toMatchObject({
      equippedShorts: 'charcoal',
      purchases: [{ itemId: 'cobalt', cost: 40 }],
    })
  })

  it('explains what’s missing when you can’t afford something', () => {
    openShop(profile, [])
    fireEvent.click(screen.getByRole('button', { name: 'Buy Checkered flag for 100 coins' }))
    expect(status()).toHaveTextContent(/You need \d+ more coins\. Keep running!/)
    expect(JSON.parse(localStorage.getItem(WALLET_KEY) ?? 'null')).toBeNull() // nothing bought
  })

  it('keeps the distance locked for the first 30 days, whatever your coins', () => {
    openShop({ ...profile, classChosenOn: '2026-10-01' })
    expect(
      screen.getByText(
        /Your first 30 days stay on the 10K\. 21 more days to go\. Coins can’t skip this\./,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'New distance' })).not.toBeInTheDocument()
  })

  it('switches distance for 100 coins after the lock, with confirmation', () => {
    const coins = earned()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    openShop()
    fireEvent.change(screen.getByRole('combobox', { name: 'New distance' }), {
      target: { value: 'half' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Switch for 100 coins' }))

    expect(confirm).toHaveBeenCalledWith(
      'Switch from the 10K to the Half marathon for 100 coins? Your plan updates straight away.',
    )
    expect(status()).toHaveTextContent('Switched to the Half marathon. Your plan has been updated.')
    expect(screen.getByText(`${coins - 100} coins`)).toBeInTheDocument()
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}').profile
    expect(saved.distanceClass).toBe('half')
  })

  it('warns a novice who switches to the marathon, without blocking', () => {
    openShop({ ...profile, canRun30Min: false })
    fireEvent.change(screen.getByRole('combobox', { name: 'New distance' }), {
      target: { value: 'marathon' },
    })
    expect(screen.getByText('A marathon is a big step without a running base.')).toBeInTheDocument()
    expect(screen.getByText(/Not medical advice\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Switch for 100 coins' })).toBeEnabled()
  })
})
