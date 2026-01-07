import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously',
        url: 'http://localhost',
        localStorage: {
          filename: './.vitest-localstorage.json',
        },
      },
    },
  },
})