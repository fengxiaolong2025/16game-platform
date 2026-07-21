#!/bin/bash
# 恢复数据库 — 在阿里云服务器上执行
set -e

INSTALL_DIR="/opt/esports-platform"
DB_FILE="$INSTALL_DIR/server/data/esports.db"

echo "============================================"
echo "  恢复电竞平台数据库"
echo "============================================"

# 1. 停止后端
echo "[1/4] 停止后端服务..."
pm2 stop esports-backend 2>/dev/null || true

# 2. 备份当前空库（以防万一）
echo "[2/4] 备份当前数据库..."
if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "${DB_FILE}.empty.$(date +%s)"
  echo "  空库已备份: ${DB_FILE}.empty.$(date +%s)"
fi

# 3. 替换数据库
echo "[3/4] 替换数据库..."
mkdir -p $INSTALL_DIR/server/data
cp /tmp/esports.db.bak "$DB_FILE"
chmod 644 "$DB_FILE"

# 删除 WAL/SHM 残留文件（让后端重新创建干净的）
rm -f "$DB_FILE-wal" "$DB_FILE-shm" 2>/dev/null || true

# 4. 重启后端
echo "[4/4] 重启后端服务..."
pm2 restart esports-backend
sleep 2

# 验证
echo ""
echo "============================================"
echo "  恢复完成！验证数据..."
echo "============================================"
curl -s http://localhost:3001/api/tournaments
echo ""
echo ""
echo "用户数量:"
curl -s http://localhost:3001/api/auth/users/count 2>/dev/null || echo "(手动验证: curl http://localhost:3001/api/tournaments)"
echo ""
