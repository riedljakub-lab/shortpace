import { describe, expect, it } from 'vitest'
import { createPreferencesRepository, THEME_KEY, type KeyValueStore } from './storage'

function memoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  }
}

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('storage blocked')
  },
  setItem: () => {
    throw new Error('storage full')
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
