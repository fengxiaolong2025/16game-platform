#!/bin/bash
# 电竞赛事平台 — 阿里云一键部署脚本
# 使用方法：在服务器上执行 bash deploy-aliyun.sh
set -e

echo ""
echo "============================================"
echo "  电竞赛事平台 — 阿里云一键部署"
echo "============================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请使用 root 用户执行：sudo bash deploy-aliyun.sh"
  exit 1
fi

# 1. 安装系统依赖
echo "[1/8] 安装系统依赖..."
apt update -y
apt install -y curl wget git vim nginx build-essential python3-certbot-nginx certbot

# 2. 安装 Node.js 22
echo ""
echo "[2/8] 安装 Node.js 22..."
if command -v node &> /dev/null; then
  echo "Node.js 已安装：$(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
fi
node -v
npm -v

# 3. 安装 PM2
echo ""
echo "[3/8] 安装 PM2..."
npm install -g pm2
pm2 -v

# 4. 拉取代码
echo ""
echo "[4/8] 拉取代码..."
INSTALL_DIR="/opt/esports-platform"
if [ -d "$INSTALL_DIR" ]; then
  echo "目录已存在，更新代码..."
  cd $INSTALL_DIR
  git pull origin master
else
  git clone https://github.com/fengxiaolong2025/16game-platform.git $INSTALL_DIR
  cd $INSTALL_DIR
fi

# 5. 安装依赖并构建
echo ""
echo "[5/8] 安装依赖并构建..."
cd $INSTALL_DIR/server
npm install
npx tsc

cd $INSTALL_DIR/client
npm install
npx vite build

# 6. 配置环境
echo ""
echo "[6/8] 配置生产环境..."
mkdir -p $INSTALL_DIR/logs
mkdir -p $INSTALL_DIR/server/data

# 生成 JWT 密钥
JWT_SECRET=$(openssl rand -hex 32)
cat > $INSTALL_DIR/.env << EOF
PORT=3001
JWT_SECRET=$JWT_SECRET
DB_TYPE=sqlite
EOF

# 创建 PM2 配置
cat > $INSTALL_DIR/ecosystem.config.json << 'EOF'
{
  "apps": [
    {
      "name": "esports-backend",
      "cwd": "/opt/esports-platform/server",
      "script": "dist/main.js",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3001"
      },
      "max_memory_restart": "500M",
      "error_file": "/opt/esports-platform/logs/backend-error.log",
      "out_file": "/opt/esports-platform/logs/backend-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss"
    },
    {
      "name": "esports-frontend",
      "cwd": "/opt/esports-platform",
      "script": "server.js",
      "env": {
        "NODE_ENV": "production",
        "PORT": "8000"
      },
      "max_memory_restart": "300M",
      "error_file": "/opt/esports-platform/logs/frontend-error.log",
      "out_file": "/opt/esports-platform/logs/frontend-out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss"
    }
  ]
}
EOF

# 7. 启动服务
echo ""
echo "[7/8] 启动服务..."
pm2 delete all 2>/dev/null || true
pm2 start $INSTALL_DIR/ecosystem.config.json
pm2 save
pm2 startup systemd -y

# 8. 配置 Nginx
echo ""
echo "[8/8] 配置 Nginx 反向代理..."
cat > /etc/nginx/sites-available/esports-platform << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
}
EOF

ln -sf /etc/nginx/sites-available/esports-platform /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx

# 验证
echo ""
echo "============================================"
echo "  ✅ 部署完成！"
echo "============================================"
echo ""
echo "🌐 访问地址：http://121.41.71.134"
echo "📂 安装目录：/opt/esports-platform"
echo "🔐 JWT 密钥：已自动生成（/opt/esports-platform/.env）"
echo ""
echo "常用命令："
echo "  pm2 status          # 查看服务状态"
echo "  pm2 logs            # 查看日志"
echo "  pm2 restart all     # 重启服务"
echo ""
echo "如需配置域名和 HTTPS："
echo "  1. 域名解析 A 记录指向 121.41.71.134"
echo "  2. 执行：certbot --nginx -d your-domain.com"
echo ""
