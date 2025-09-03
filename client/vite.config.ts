import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Garante que os caminhos para os ficheiros JS/CSS no HTML são relativos
  base: './', 
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Diz ao Vite para colocar os ficheiros construídos em dist/public
    outDir: '../dist/public',
    emptyOutDir: true,
  }
})

