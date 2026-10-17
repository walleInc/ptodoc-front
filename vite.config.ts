import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // На Windows с нерабочим IPv6 loopback localhost резолвится в ::1 и браузер
    // не достучится до сервера — держим привязку на IPv4- loopback.
    host: '127.0.0.1',
    // Same-origin /api → бэк (cookie-сессия без CORS). Порт бэка: VITE_PROXY_TARGET
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
})