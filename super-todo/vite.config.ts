import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/giiku-mini-conference-2026/super-todo/',
  plugins: [react()],
})
