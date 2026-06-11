import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { profilingSavePlugin } from 'vite-dev-profiler/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    profilingSavePlugin(),
  ],
})
