import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Custom plugin to handle routing
const routingPlugin = () => {
  return {
    name: 'custom-routing',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Serve landing page for root
        if (req.url === '/') {
          req.url = '/index.html'
        }
        // Serve React app for all React routes
        else if (req.url?.match(/^\/(login|register|citizen|admin|worker)/)) {
          req.url = '/app.html'
        }
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routingPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html'
      }
    }
  },
  server: {
    open: '/index.html'
  }
})
