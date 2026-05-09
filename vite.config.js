import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@dnd-kit/core', '@dnd-kit/utilities'],
          'vendor-utils': ['date-fns', 'zustand'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/users': { target: 'http://localhost:3001', changeOrigin: true },
      '/health': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
