import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
// Adds DOM matchers like toBeInTheDocument() to Vitest's expect().
import '@testing-library/jest-dom/vitest'

// Unmount rendered components after each test so tests don't leak into each other.
afterEach(() => {
  cleanup()
})
