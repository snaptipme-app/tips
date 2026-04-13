#!/bin/bash
# ═══════════════════════════════════════════════
# SnapTip VPS Deployment Script
# Run as root: bash deploy.sh
# ═══════════════════════════════════════════════

set -e

echo "🚀 SnapTip Deployment Starting..."
echo "================================="

# ① Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# ② Install essential tools
echo "🔧 Installing essentials..."
apt install -y curl git nginx certbot python3-certbot-nginx

# ③ Install Node.js 20 LTS via NodeSource
echo "📗 Installing Node.js 20..."
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

# ④ Install PM2 globally
echo "⚙️  Installing PM2..."
npm install -g pm2

# ⑤ Clone the repository
echo "📂 Cloning SnapTip repo..."
rm -rf /var/www/snaptip
git clone https://github.com/snaptipme-app/tips.git /var/www/snaptip

# ⑥ Create production .env
echo "🔐 Creating production .env..."
JWT_SECRET=$(openssl rand -base64 32)
cat > /var/www/snaptip/server/.env << EOF
PORT=5000
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EMAIL_USER=snaptip.me@gmail.com
EMAIL_PASS=
EOF
echo "⚠️  IMPORTANT: Edit /var/www/snaptip/server/.env to add your EMAIL_PASS"

# ⑦ Install server dependencies
echo "📦 Installing server dependencies..."
cd /var/www/snaptip/server
npm install --production

# ⑧ Install client dependencies and build
echo "🏗️  Building React frontend..."
cd /var/www/snaptip/client
npm install
npm run build

# ⑨ Start backend with PM2
echo "🟢 Starting backend with PM2..."
pm2 delete snaptip 2>/dev/null || true
pm2 start /var/www/snaptip/server/index.js --name snaptip
pm2 save
pm2 startup

# ⑩ Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/snaptip << 'NGINX'
server {
    listen 80;
    server_name snaptip.me www.snaptip.me;

    # Serve React frontend
    location / {
        root /var/www/snaptip/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Node.js backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Proxy uploads
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
    }
}
NGINX

# Enable site, remove default
ln -sf /etc/nginx/sites-available/snaptip /etc/nginx/sites-enabled/snaptip
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t && systemctl restart nginx
systemctl enable nginx

echo ""
echo "═══════════════════════════════════════"
echo "✅ SnapTip Deployment Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "📋 Next steps:"
echo "  1. Edit EMAIL_PASS in /var/www/snaptip/server/.env"
echo "  2. After editing: pm2 restart snaptip"
echo "  3. Point DNS to this server, then run:"
echo "     certbot --nginx -d snaptip.me -d www.snaptip.me"
echo ""
echo "🔍 Verification:"
echo "  pm2 status"
echo "  curl http://localhost:5000/api/health"
echo "  systemctl status nginx"
echo ""
