import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { serverPlugin } from './server-plugin'

export default defineConfig({
  plugins: [react(), serverPlugin(), sentryVitePlugin({
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    telemetry: false,
  })],

  server: {
    allowedHosts: ['.ts.net'],
    historyApiFallback: true,
  },

  preview: {
    host: '0.0.0.0',
    historyApiFallback: true,
  },

  build: {
    sourcemap: true
  },

  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  }
})
