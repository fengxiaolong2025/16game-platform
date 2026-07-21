import { View, Text } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { notificationApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import { formatDate } from '../../utils'
import './index.scss'

interface Notification {
  id: string
  title: string
  content: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const token = useAuthStore((s) => s.token)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.list(),
        notificationApi.unreadCount(),
      ])
      const data = (listRes.data as any) || []
      setNotifications(Array.isArray(data) ? data : data.items || [])
      setUnreadCount((countRes.data as any)?.count || 0)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useLoad(() => {
    fetchData()
  })

  const handleRead = async (id: string, isRead: boolean) => {
    if (isRead) return
    try {
      await notificationApi.markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('标记已读失败', err)
    }
  }

  const handleReadAll = async () => {
    if (unreadCount === 0) return
    try {
      await notificationApi.markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
      Taro.showToast({ title: '全部已读', icon: 'success' })
    } catch (err) {
      console.error('操作失败', err)
    }
  }

  if (!token) {
    return (
      <View className="notification-page">
        <View className="empty-state">
          <Text>请先登录</Text>
          <Text
            className="login-link"
            onClick={() => Taro.reLaunch({ url: '/pages/login/index' })}
          >
            去登录
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View className="notification-page">
      {/* 顶部操作栏 */}
      {unreadCount > 0 && (
        <View className="notif-top-bar">
          <Text className="unread-text">{unreadCount} 条未读消息</Text>
          <Text className="read-all-btn" onClick={handleReadAll}>全部已读</Text>
        </View>
      )}

      {/* 通知列表 */}
      <View className="notif-list">
        {notifications.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无消息</Text>
          </View>
        )}

        {notifications.map((notif) => (
          <View
            key={notif.id}
            className={`notif-card ${!notif.is_read ? 'unread' : ''}`}
            onClick={() => handleRead(notif.id, notif.is_read)}
          >
            <View className="notif-header">
              <Text className="notif-title">{notif.title}</Text>
              {!notif.is_read && <View className="unread-dot" />}
            </View>
            <Text className="notif-content">{notif.content}</Text>
            <Text className="notif-time">{formatDate(notif.created_at)}</Text>
          </View>
        ))}

        {loading && <View className="loading-text">加载中...</View>}
      </View>
    </View>
  )
}
