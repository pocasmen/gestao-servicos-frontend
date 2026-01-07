import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
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
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase-vendor';
            }
            if (id.includes('bootstrap')) {
              return 'bootstrap-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  envPrefix: 'VITE'
})