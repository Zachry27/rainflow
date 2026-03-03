#!/bin/bash
# ================================================
# 🌊 RainFlow — VPS Auto Deploy Script
# Jalankan di VPS (console DigitalOcean)
# ================================================

set -e

echo "🌊 Deploying RainFlow..."

# 1. Install dependencies
apt update && apt install -y git nodejs npm python3 python3-pip python3-venv ffmpeg nginx

# 2. Clone from GitHub
cd /root
git clone https://github.com/Zachry27/rainflow.git || true
cd /root/rainflow

# 3. Frontend — build
npm install
npm run build

# 4. Backend — python venv
cd /root/rainflow/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 5. Setup .env
cp .env.example .env

# 6. Nginx config — serve frontend + proxy backend
cat > /etc/nginx/sites-available/rainflow << 'NGINX'
server {
    listen 80;
    server_name _;

    # Frontend (Vite build)
    root /root/rainflow/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /v1/ {
        proxy_pass http://127.0.0.1:9564;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_read_timeout 300;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/rainflow /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# 7. Backend systemd service
cat > /etc/systemd/system/rainflow-api.service << 'SVC'
[Unit]
Description=RainFlow Backend API
After=network.target

[Service]
Type=simple
WorkingDirectory=/root/rainflow/backend
ExecStart=/root/rainflow/backend/.venv/bin/python main.py
Restart=always
Environment=PATH=/root/rainflow/backend/.venv/bin:/usr/bin

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable rainflow-api
systemctl start rainflow-api

echo ""
echo "✅ RainFlow deployed!"
echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
echo "🔧 Backend:  http://$(curl -s ifconfig.me):9564"
echo ""
