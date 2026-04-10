import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { revalCachePlugin } from './vite-reval-cache'

export default defineConfig({
  plugins: [react(), revalCachePlugin()],
  server: {
    allowedHosts: ['.ts.net'],
    historyApiFallback: true,
  },
  preview: {
    host: '0.0.0.0',
    historyApiFallback: true,
  },
})
