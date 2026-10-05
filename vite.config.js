import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020', // older iOS Safari safe
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks: { three: ['three'], gsap: ['gsap', 'gsap/ScrollTrigger'] } } }
  }
})
