import { describe, expect, it } from 'vitest'
import { createWalletRepository, WALLET_KEY, type KeyValueStore } from '../storage/storage'
import {
  buyShorts,
  canBuyShorts,
  canSwitchClass,
  coinBalance,
  EMPTY_WALLET,
  equipShorts,
  ownsShorts,
  recordClassSwitch,
} from './wallet'

describe('wallet', () => {
  it('balance = earned − spent', () => {
    const w = buyShorts(EMPTY_WALLET, 'cobalt', '2026-11-21', 'p1') // 40
    expect(coinBalance(100, w)).toBe(60)
  })

  it('owns the free default and whatever was bought, and wears new shorts straight away', () => {
    expect(ownsShorts(EMPTY_WALLET, 'charcoal')).toBe(true)
    expect(ownsShorts(EMPTY_WALLET, 'volt')).toBe(false)
    const w = buyShorts(EMPTY_WALLET, 'volt', '2026-11-21', 'p1')
    expect(ownsShorts(w, 'volt')).toBe(true)
    expect(w.equippedShorts).toBe('volt')
  })

  it('explains why you can’t buy', () => {
    expect(canBuyShorts(EMPTY_WALLET, 'cobalt', 25)).toEqual({
      ok: false,
      message: 'You need 15 more coins. Keep running!',
    })
    const w = buyShorts(EMPTY_WALLET, 'cobalt', '2026-11-21', 'p1')
    expect(canBuyShorts(w, 'cobalt', 500)).toMatchObject({
      ok: false,
      message: 'You already own these.',
    })
    expect(canBuyShorts(EMPTY_WALLET, 'cobalt', 40)).toEqual({ ok: true })
  })

  it('only lets you wear shorts you own', () => {
    expect(equipShorts(EMPTY_WALLET, 'checkered').equippedShorts).toBe('charcoal')
  })
})

describe('switching distance', () => {
  const profile = { classChosenOn: '2026-11-01', distanceClass: '10k' as const }

  it('is impossible during the 30-day lock, whatever your coins', () => {
    const check = canSwitchClass(profile, 'half', '2026-11-21', 9999)
    expect(check.ok).toBe(false)
    if (!check.ok)
      expect(check.message).toBe(
        'Your first 30 days stay on the 10K. 10 more days to go. Coins can’t skip this.',
      )
  })

  it('costs 100 coins after the lock', () => {
    expect(canSwitchClass(profile, 'half', '2026-12-01', 99)).toMatchObject({ ok: false })
    expect(canSwitchClass(profile, 'half', '2026-12-01', 100)).toEqual({ ok: true })
    expect(canSwitchClass(profile, '10k', '2026-12-01', 500)).toMatchObject({ ok: false })
  })

  it('records the switch as a purchase', () => {
    const w = recordClassSwitch(EMPTY_WALLET, '10k', 'half', '2026-12-01', 's1')
    expect(coinBalance(150, w)).toBe(50)
    expect(w.purchases[0]).toMatchObject({ kind: 'class-switch', from: '10k', to: 'half' })
  })
})

describe('wallet storage', () => {
  function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
    const data = new Map(Object.entries(initial))
    return {
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    }
  }

  it('round-trips and starts empty', () => {
    const repo = createWalletRepository(memoryStore())
    expect(repo.getWallet()).toEqual(EMPTY_WALLET)
    const w = recordClassSwitch(
      buyShorts(EMPTY_WALLET, 'flamingo', '2026-11-21', 'p1'),
      '5k',
      '10k',
      '2026-12-25',
      's1',
    )
    expect(repo.saveWallet(w)).toBe(true)
    expect(repo.getWallet()).toEqual(w)
  })

  it('drops damaged purchases and unknown items instead of crashing', () => {
    const raw = JSON.stringify({
      version: 1,
      wallet: {
        purchases: [
          { id: 'ok', date: '2026-11-21', kind: 'shorts', itemId: 'cobalt', cost: 40 },
          { id: 'x', date: '2026-11-21', kind: 'shorts', itemId: 'gold-plated', cost: 1 },
          { id: 'y', date: 'yesterday', kind: 'shorts', itemId: 'volt', cost: 60 },
        ],
        equippedShorts: 'invisible',
      },
    })
    const w = createWalletRepository(memoryStore({ [WALLET_KEY]: raw })).getWallet()
    expect(w.purchases.map((p) => p.id)).toEqual(['ok'])
    expect(w.equippedShorts).toBe('charcoal')
    expect(createWalletRepository(memoryStore({ [WALLET_KEY]: '{bad' })).getWallet()).toEqual(
      EMPTY_WALLET,
    )
  })
})
