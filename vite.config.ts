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
      '/api': {
        target: undefined, // placeholder, will be set dynamically
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // 動的にリクエスト元のホストをターゲットにする
            const host = req.headers.host;
            if (host) {
              proxyReq.setHeader('host', host);
            }
          });
        },
      },
      '/pictures': {
        target: undefined,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const host = req.headers.host;
            if (host) {
              proxyReq.setHeader('host', host);
            }
          });
        },
      },
      '/thumbnails': {
        target: undefined,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const host = req.headers.host;
            if (host) {
              proxyReq.setHeader('host', host);
            }
          });
        },
      },
    }
  },
  publicDir: false,
})

