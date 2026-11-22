import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
// Adds DOM matchers like toBeInTheDocument() to Vitest's expect().
import '@testing-library/jest-dom/vitest'

// Unmount rendered components after each test so tests don't leak into each other.
afterEach(() => {
  cleanup()
})

// jsdom has no ResizeObserver; Recharts' ResponsiveContainer needs one. A no-op is enough for tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// jsdom has no layout, so Recharts warns that charts are 0×0. Expected in tests; hide only that.
const originalWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('of chart should be greater than 0')) return
  originalWarn(...args)
}
