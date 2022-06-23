import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Path from 'path'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': Path.resolve(__dirname, 'src')
    }
  },
  plugins: [Vue()],
  build: {
    target: 'esnext',
    outDir: 'docs'
  }
})
