import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '35f8da536f1c.ngrok-free.app'
    ]
    // Removed /admin-dashboard proxy - frontend handles this route now
  }
})
