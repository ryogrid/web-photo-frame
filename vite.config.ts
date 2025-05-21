import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'src/assets/pictures/*',
          dest: 'pictures'
        }
      ]
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'https://web-photo-frame.onrender.com',
      '/pictures': 'https://web-photo-frame.onrender.com',
      '/thumbnails': 'https://web-photo-frame.onrender.com'
    }
  }
})

