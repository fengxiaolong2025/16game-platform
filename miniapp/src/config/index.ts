// 环境配置
// 开发环境：本地后端
// 生产环境：改为你的 HTTPS 域名，如 'https://esports.example.com/api'
export const BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001/api'
  : 'https://your-domain.com/api'

// 上传文件/静态资源基础URL（不含/api前缀）
export const STATIC_BASE = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3001'
  : 'https://your-domain.com'
