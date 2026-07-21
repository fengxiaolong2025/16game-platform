// 环境配置
// 注意：Taro build 命令会强制将 NODE_ENV 设为 production，所以不能用 process.env.NODE_ENV 判断
// 使用 TARO_APP_ENV 自定义环境变量，默认开发环境
// 开发：TARO_APP_ENV=dev npx taro build --type weapp
// 生产：TARO_APP_ENV=prod npx taro build --type weapp
const isDev = process.env.TARO_APP_ENV !== 'prod'

// 阿里云服务器：121.41.71.134，后端端口 3001
export const BASE_URL = isDev
  ? 'http://121.41.71.134:3001/api'
  : 'https://your-domain.com/api'

// 上传文件/静态资源基础URL（不含/api前缀）
export const STATIC_BASE = isDev
  ? 'http://121.41.71.134:3001'
  : 'https://your-domain.com'
