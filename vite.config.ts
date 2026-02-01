/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdfjs-dist'],
          'zip-vendor': ['jszip', 'file-saver'],
        },
      },
    },
  },
})
