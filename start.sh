#!/bin/bash
# 电竞赛事平台 - 一键启动脚本
echo "========================================"
echo "  电竞赛事平台 - 启动中..."
echo "========================================"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start backend
echo "[1/2] 启动后端服务 (port 3001)..."
cd "$PROJECT_DIR/server"
NODE_OPTIONS="" npx ts-node src/main.ts &
BACKEND_PID=$!
sleep 3

# Start frontend
echo "[2/2] 启动前端服务 (port 3000)..."
cd "$PROJECT_DIR/client"
NODE_OPTIONS="" npx vite --host 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  ✅ 启动完成！"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo "========================================"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
