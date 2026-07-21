#!/bin/bash
# 电竞赛事平台后端 — 阿里云部署脚本
# 使用方法：在服务器上执行 bash deploy-backend.sh
set -e

INSTALL_DIR="/opt/esports-platform"
PORT=3001

echo ""
echo "============================================"
echo "  电竞赛事平台后端 — 阿里云部署"
echo "============================================"
echo ""

# 1. 安装 Node.js 22（如果没装）
if ! command -v node &> /dev/null; then
  echo "[1/6] 安装 Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt install -y nodejs
else
  echo "[1/6] Node.js 已安装：$(node -v)"
fi

# 2. 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo "[2/6] 安装 PM2..."
  npm install -g pm2
else
  echo "[2/6] PM2 已安装：$(pm2 -v)"
fi

# 3. 解压代码
echo "[3/6] 解压代码..."
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR
tar xzf /tmp/esports-server.tar.gz --strip-components=0

# 4. 安装依赖并编译
echo "[4/6] 安装依赖并编译..."
cd $INSTALL_DIR/server
npm install
npx tsc

# 5. 配置环境变量
echo "[5/6] 配置环境变量..."
mkdir -p $INSTALL_DIR/logs
mkdir -p $INSTALL_DIR/server/data
mkdir -p $INSTALL_DIR/server/uploads

JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "fallback-jwt-secret-$(date +%s)")

cat > $INSTALL_DIR/server/.env << EOF
PORT=$PORT
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
DB_TYPE=sqlite
DB_PATH=$INSTALL_DIR/server/data/esports.db
WECHAT_APPID=wx38627c12ff9f0f9e
WECHAT_SECRET=ad527fcbbe421226e9f18c63e43b205f
EOF

echo "  JWT_SECRET: $JWT_SECRET"
echo "  WECHAT_APPID: wx38627c12ff9f0f9e"

# 6. 启动服务
echo "[6/6] 启动服务..."
pm2 delete esports-backend 2>/dev/null || true
pm2 start $INSTALL_DIR/server/dist/main.js \
  --name esports-backend \
  --env production \
  --cwd $INSTALL_DIR/server \
  --max-memory-restart 500M \
  --error-file $INSTALL_DIR/logs/backend-error.log \
  --output-file $INSTALL_DIR/logs/backend-out.log
pm2 save
pm2 startup systemd -y 2>/dev/null || true

# 验证
sleep 2
echo ""
echo "============================================"
echo "  部署完成！"
echo "============================================"
echo ""
echo "API 地址: http://121.41.71.134:$PORT/api"
echo "安装目录: $INSTALL_DIR/server"
echo ""
echo "验证服务:"
echo "  curl http://localhost:$PORT/api/tournaments"
echo ""
echo "常用命令:"
echo "  pm2 status              # 查看状态"
echo "  pm2 logs esports-backend # 查看日志"
echo "  pm2 restart esports-backend # 重启"
echo ""
echo "注意: 确保阿里云安全组已开放 $PORT 端口 (TCP)"
echo ""
