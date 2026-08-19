import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) return 'firebase'
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) return 'charts'
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/scheduler')) return 'react-dom'
          if (id.includes('node_modules/react')) return 'react'
          if (id.includes('node_modules/xlsx')) return 'xlsx'
          if (id.includes('node_modules')) return 'vendor'
          return undefined
        },
      },
    },
  },
})
