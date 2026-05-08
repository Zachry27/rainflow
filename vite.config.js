import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'RainFlow',
                short_name: 'RainFlow',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                icons: [
                    {
                        src: 'https://cdn-icons-png.flaticon.com/512/1146/1146124.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            }
        })
    ],
    server: {
        port: 5173,
        host: true, // supaya bisa diakses via IP di RDP
        allowedHosts: true, // izinkan akses dari custom domain/tunnel
        proxy: {
            // Proxy Auth & Admin ke Python backend (port 9564)
            '/v1/auth': {
                target: 'http://127.0.0.1:9564',
                changeOrigin: true,
            },
            '/v1/admin': {
                target: 'http://127.0.0.1:9564',
                changeOrigin: true,
            },
            '/v1/drive': {
                target: 'http://127.0.0.1:9564',
                changeOrigin: true,
            },
            // Proxy ke Rainflow backend (Step 1, 2, 4)
            '/v1': {
                target: 'http://127.0.0.1:9564',
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
