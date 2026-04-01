import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imageCachePlugin } from './vite-image-cache'

export default defineConfig({
  plugins: [react(), imageCachePlugin()],
})
