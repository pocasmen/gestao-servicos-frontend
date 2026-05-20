import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  return {
    define: {
      ...(isBuild ? { 'process.env.NODE_ENV': JSON.stringify('production') } : {}),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    dedupe: ['react', 'react-dom']
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-bootstrap']
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    },
    // S2 — Prevent browser from caching invite/registration pages.
    // These pages read one-time tokens from the URL; caching them would allow
    // the browser to restore a stale version with an already-consumed token.
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  },
  build: {
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      treeshake: true,
      input: path.resolve(__dirname, 'index.html'),
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('scheduler') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('bootstrap') || id.includes('react-bootstrap') || id.includes('lucide')) {
              return 'vendor-ui';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('react-big-calendar') || id.includes('date-fns') || id.includes('react-datepicker')) {
              return 'vendor-calendar';
            }
            if (id.includes('html2pdf.js')) {
              return 'vendor-pdf';
            }
            if (id.includes('axios')) {
              return 'vendor-utils';
            }
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  envPrefix: 'VITE',
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
      },
    },
  },
  };
})