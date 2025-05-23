import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
//import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    react(),
    // viteStaticCopy({
    //   targets: [
    //     {
    //       src: 'src/assets/pictures/*',
    //       dest: 'pictures'
    //     }
    //   ]
    // })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/pictures': 'http://localhost:3000',
      '/thumbnails': 'http://localhost:3000',
    }
  }
})

