/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages serves the site from /shortpace/, not from the domain root.
  base: '/shortpace/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Load real CSS in tests (Vitest blanks it by default); contrast.test.ts reads the tokens.
    css: true,
  },
})
