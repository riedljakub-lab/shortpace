import { describe, expect, it } from 'vitest'
import { applyTheme, isThemePreference, resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('follows the device when the preference is "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('lets a manual choice override the device', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
})

describe('isThemePreference', () => {
  it('accepts only the three known values', () => {
    expect(isThemePreference('system')).toBe(true)
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('purple')).toBe(false)
    expect(isThemePreference(null)).toBe(false)
  })
})

describe('applyTheme', () => {
  it('sets data-theme on the given element', () => {
    const el = document.createElement('html')
    applyTheme('dark', el)
    expect(el.dataset.theme).toBe('dark')
  })
})
