import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
 server: {
  port: 3000,
  strictPort: true,
  host: '0.0.0.0',
  allowedHosts: ['54ecee46c2f5.ngrok-free.app', 'localhost', '192.168.0.114']
},
})
