import Taro from '@tarojs/taro'
import { BASE_URL } from '../config'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  params?: any
  header?: Record<string, string>
}

export interface UploadOptions {
  url: string
  filePath: string
  name?: string
  formData?: Record<string, any>
}

/**
 * 通用请求封装（替代 web 端的 Axios 实例）
 * - 自动附加 Bearer token
 * - 401 自动跳转登录页
 * - 统一错误提示
 */
function request<T = any>(options: RequestOptions): Promise<{ data: T; statusCode: number }> {
  const token = Taro.getStorageSync('token')

  // 拼接 query params
  let url = options.url
  if (options.params) {
    const qs = Object.entries(options.params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
    if (qs) url += (url.includes('?') ? '&' : '?') + qs
  }

  return Taro.request({
    url: `${BASE_URL}${url}`,
    method: options.method || 'GET',
    data: options.data,
    timeout: 15000,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.header,
    },
  }).then((res) => {
    if (res.statusCode === 401) {
      Taro.removeStorageSync('token')
      Taro.removeStorageSync('user')
      Taro.reLaunch({ url: '/pages/login/index' })
      return Promise.reject(new Error('登录已过期，请重新登录'))
    }
    if (res.statusCode >= 400) {
      const msg = (res.data as any)?.message || `请求失败 (${res.statusCode})`
      Taro.showToast({ title: msg, icon: 'none' })
      return Promise.reject(new Error(msg))
    }
    return { data: res.data as T, statusCode: res.statusCode }
  })
}

/**
 * 文件上传（替代 web 端的 FormData + Axios）
 * 小程序用 Taro.uploadFile，单次单文件
 */
function upload<T = any>(options: UploadOptions): Promise<{ data: T }> {
  const token = Taro.getStorageSync('token')
  return Taro.uploadFile({
    url: `${BASE_URL}${options.url}`,
    filePath: options.filePath,
    name: options.name || 'images',
    formData: options.formData,
    header: token ? { Authorization: `Bearer ${token}` } : {},
  }).then((res) => {
    const data = JSON.parse(res.data) as T
    return { data }
  })
}

const http = {
  get: <T = any>(url: string, options?: { params?: any }) =>
    request<T>({ url, method: 'GET', params: options?.params }),
  post: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) =>
    request<T>({ url, method: 'PUT', data }),
  delete: <T = any>(url: string) =>
    request<T>({ url, method: 'DELETE' }),
  upload,
}

export default http
