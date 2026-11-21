import { describe, expect, it } from 'vitest'
import { SAMPLE_PROFILE } from '../test/fixtures'
import {
  createPreferencesRepository,
  createProfileRepository,
  PROFILE_KEY,
  THEME_KEY,
  type KeyValueStore,
} from './storage'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('storage blocked')
  },
  setItem: () => {
    throw new Error('storage full')
  },
  removeItem: () => {
    throw new Error('storage blocked')
  },
}

describe('preferences repository: theme', () => {
  it('defaults to "system" when nothing is saved', () => {
    expect(createPreferencesRepository(memoryStore()).getThemePreference()).toBe('system')
  })

  it('remembers the saved choice', () => {
    const repo = createPreferencesRepository(memoryStore())
    repo.setThemePreference('dark')
    expect(repo.getThemePreference()).toBe('dark')
  })

  it('ignores garbage values and falls back to "system"', () => {
    const repo = createPreferencesRepository(memoryStore({ [THEME_KEY]: 'neon' }))
    expect(repo.getThemePreference()).toBe('system')
  })

  it('never crashes when storage is missing or broken', () => {
    for (const store of [null, brokenStore]) {
      const repo = createPreferencesRepository(store)
      expect(() => repo.setThemePreference('light')).not.toThrow()
      expect(repo.getThemePreference()).toBe('system')
    }
  })
})

describe('profile repository', () => {
  it('returns null before onboarding', () => {
    expect(createProfileRepository(memoryStore()).getProfile()).toBeNull()
  })

  it('round-trips a profile exactly', () => {
    const repo = createProfileRepository(memoryStore())
    expect(repo.saveProfile(SAMPLE_PROFILE)).toBe(true)
    expect(repo.getProfile()).toEqual(SAMPLE_PROFILE)
  })

  it('round-trips every baseline kind', () => {
    const repo = createProfileRepository(memoryStore())
    for (const baseline of [{ kind: 'unknown' }, { kind: 'easyPace', secPerKm: 400 }] as const) {
      repo.saveProfile({ ...SAMPLE_PROFILE, baseline })
      expect(repo.getProfile()?.baseline).toEqual(baseline)
    }
  })

  it('deletes the profile', () => {
    const repo = createProfileRepository(memoryStore())
    repo.saveProfile(SAMPLE_PROFILE)
    repo.deleteProfile()
    expect(repo.getProfile()).toBeNull()
  })

  it('rejects corrupted, old-format or invalid data instead of crashing', () => {
    const cases = [
      'not json{',
      JSON.stringify(SAMPLE_PROFILE), // missing the { version, profile } wrapper
      JSON.stringify({ version: 999, profile: SAMPLE_PROFILE }),
      JSON.stringify({ version: 1, profile: { ...SAMPLE_PROFILE, persona: 'unicorn' } }),
      JSON.stringify({ version: 1, profile: { ...SAMPLE_PROFILE, runDays: ['funday'] } }),
      JSON.stringify({ version: 1, profile: { ...SAMPLE_PROFILE, age: '34' } }),
      JSON.stringify({ version: 1, profile: { ...SAMPLE_PROFILE, baseline: { kind: 'race' } } }),
    ]
    for (const raw of cases) {
      const repo = createProfileRepository(memoryStore({ [PROFILE_KEY]: raw }))
      expect(repo.getProfile(), raw.slice(0, 40)).toBeNull()
    }
  })

  it('reports a failed save and never crashes when storage is missing or broken', () => {
    for (const store of [null, brokenStore]) {
      const repo = createProfileRepository(store)
      expect(repo.saveProfile(SAMPLE_PROFILE)).toBe(false)
      expect(repo.getProfile()).toBeNull()
      expect(() => repo.deleteProfile()).not.toThrow()
    }
  })
})
