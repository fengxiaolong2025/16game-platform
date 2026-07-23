import { create } from 'zustand'
import Taro from '@tarojs/taro'
import { authApi } from '../api'

export interface User {
  id: string
  nickname: string
  avatar?: string
  phone?: string
  email?: string
  games?: string[]
  game_ids?: string
  role?: number
  username?: string
  bio?: string
  position?: string
  player_photos?: string[]
  ladder_score?: number
  wechat_union_id?: string
  status?: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  fetchUser: () => Promise<void>
  setUser: (user: User) => void
  isLoggedIn: () => boolean
}

/**
 * 认证状态管理（从 web 端迁移）
 * 唯一变化：localStorage → Taro.setStorageSync / getStorageSync
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const raw = Taro.getStorageSync('user')
      if (!raw) return null
      // getStorageSync 可能返回字符串（JSON.stringify后）或对象
      return typeof raw === 'string' ? JSON.parse(raw) : raw
    } catch {
      return null
    }
  })(),
  token: (() => {
    try {
      return Taro.getStorageSync('token') || null
    } catch {
      return null
    }
  })(),
  loading: false,

  login: (token, user) => {
    Taro.setStorageSync('token', token)
    Taro.setStorageSync('user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    set({ token: null, user: null })
  },

  fetchUser: async () => {
    if (!get().token) return
    set({ loading: true })
    try {
      const res = await authApi.getMe()
      const user = res.data as User
      Taro.setStorageSync('user', JSON.stringify(user))
      set({ user, loading: false })
    } catch {
      get().logout()
      set({ loading: false })
    }
  },

  setUser: (user) => {
    Taro.setStorageSync('user', JSON.stringify(user))
    set({ user })
  },

  isLoggedIn: () => !!get().token,
}))
