import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src'), '@config': path.resolve(__dirname, './src/config'), '@core': path.resolve(__dirname, './src/core'), '@domain': path.resolve(__dirname, './src/core/domain'), '@application': path.resolve(__dirname, './src/core/application'), '@infrastructure': path.resolve(__dirname, './src/infrastructure'), '@presentation': path.resolve(__dirname, './src/presentation'), '@shared': path.resolve(__dirname, './src/shared') } },
  server: { port: 3000, strictPort: true, host: true },
  build: { target: 'es2022', sourcemap: false },
})
