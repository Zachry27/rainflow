import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        host: true, // supaya bisa diakses via IP di RDP
        proxy: {
            // Proxy ke GrokPI backend (Step 1, 2, 4)
            '/v1': {
                target: 'http://127.0.0.1:9563',
                changeOrigin: true,
            },
            // Proxy ke BenAlus Node.js backend (Step 3)
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            '/downloads': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
            // Proxy Socket.IO untuk real-time job status
            '/socket.io': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
                ws: true, // penting! untuk WebSocket
            },
            // Proxy audio library dari BenAlus backend
            '/audio-assets': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true,
            },
        },
    },
})
