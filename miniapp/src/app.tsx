import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { useAuthStore } from './store/auth'
import './app.scss'

function App({ children }: PropsWithChildren<Record<string, unknown>>) {
  const token = useAuthStore((s) => s.token)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  useLaunch(() => {
    // 启动时如果有token，拉取最新用户信息
    if (token) {
      fetchUser()
    }
  })

  return children
}

export default App
