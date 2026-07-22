import { View, Text, Image, Input, Button, ScrollView } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { authApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

const STATUS_MAP: Record<string, { text: string; color: string }> = {
  active: { text: '正常', color: '#4caf50' },
  banned: { text: '已封禁', color: '#f44336' },
  pending: { text: '待激活', color: '#ff9800' },
}

export default function UsersManage() {
  const currentUser = useAuthStore((s) => s.user)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await authApi.adminGetUsers()
      const data = (res.data as any) || []
      setUsers(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => {
    if (!currentUser || (currentUser.role ?? 0) < 1) {
      Taro.showToast({ title: '仅管理员可访问', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().then(() => Taro.stopPullDownRefresh())
  })

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned'
    const action = newStatus === 'banned' ? '封禁' : '解禁'
    Taro.showModal({
      title: `${action}用户`,
      content: `确认${action}该用户？`,
      confirmColor: newStatus === 'banned' ? '#f44336' : '#4caf50',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.adminUpdateStatus(userId, newStatus)
          Taro.showToast({ title: '操作成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleResetPassword = (userId: string) => {
    Taro.showModal({
      title: '重置密码',
      content: '确认将密码重置为 123456？',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.adminResetPassword(userId, '123456')
          Taro.showToast({ title: '已重置为123456', icon: 'success' })
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleDelete = (userId: string, nickname: string) => {
    Taro.showModal({
      title: '删除用户',
      content: `确认删除用户 ${nickname}？此操作不可恢复！`,
      confirmText: '确认删除',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.adminDeleteUser(userId)
          Taro.showToast({ title: '已删除', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  const handleUnbindWechat = (userId: string, nickname: string) => {
    Taro.showModal({
      title: '解绑微信',
      content: `确认解绑用户 ${nickname} 的微信？解绑后该微信将无法直接登录此账号。`,
      confirmText: '确认解绑',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.adminUnbindWechat(userId)
          Taro.showToast({ title: '微信解绑成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '解绑失败', icon: 'none' })
        }
      },
    })
  }

  const handleUpdateRole = (userId: string, nickname: string, currentRole: number) => {
    const newRole = currentRole === 2 ? 0 : 2
    const action = newRole === 2 ? '设为二级管理员' : '取消二级管理员'
    Taro.showModal({
      title: action,
      content: `确认将用户 ${nickname} ${action}？`,
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.adminUpdateRole(userId, newRole)
          Taro.showToast({ title: '操作成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const filteredUsers = searchKeyword
    ? users.filter((u) =>
        u.nickname?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        u.phone?.includes(searchKeyword)
      )
    : users

  return (
    <View className="users-manage-page">
      {/* 搜索栏 */}
      <View className="search-bar">
        <Input
          className="search-input"
          placeholder="搜索昵称 / 用户名 / 手机号"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword(e.detail.value)}
        />
        <Text className="user-count">共 {filteredUsers.length} 人</Text>
      </View>

      {/* 用户列表 */}
      <View className="user-list">
        {filteredUsers.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无用户</Text>
          </View>
        )}

        {filteredUsers.map((u) => {
          const statusMeta = STATUS_MAP[u.status] || { text: u.status, color: '#999' }
          const isSelf = u.id === currentUser?.id
          return (
            <View key={u.id} className="user-card">
              <View className="user-top">
                <Image
                  className="user-avatar"
                  src={toAbsUrl(u.avatar) || 'https://via.placeholder.com/80'}
                  mode="aspectFill"
                />
                <View className="user-info">
                  <View className="user-name-row">
                    <Text className="user-name">{u.nickname || '未设置'}</Text>
                    {u.role === 1 && <Text className="admin-tag">超级管理员</Text>}
                    {u.role === 2 && <Text className="sub-admin-tag">二级管理员</Text>}
                    {isSelf && <Text className="self-tag">本人</Text>}
                  </View>
                  <Text className="user-detail">
                    {u.username ? `@${u.username}` : ''} {u.phone ? `📱${u.phone}` : ''}
                  </Text>
                  <View className="user-meta">
                    <Text className="tag" style={{ background: `${statusMeta.color}15`, color: statusMeta.color }}>
                      {statusMeta.text}
                    </Text>
                    {u.wechat_union_id && (
                      <Text className="tag" style={{ background: '#e8f5e9', color: '#4caf50' }}>
                        微信已绑定
                      </Text>
                    )}
                    <Text className="meta-text">注册: {formatDate(u.created_at)}</Text>
                  </View>
                </View>
              </View>

              {!isSelf && u.role !== 1 && (
                <View className="user-actions">
                  {u.wechat_union_id && (
                    <Button
                      className="action-btn"
                      size="mini"
                      onClick={() => handleUnbindWechat(u.id, u.nickname || '该用户')}
                    >
                      解绑微信
                    </Button>
                  )}
                  <Button
                    className="action-btn"
                    size="mini"
                    onClick={() => handleToggleStatus(u.id, u.status)}
                  >
                    {u.status === 'banned' ? '解禁' : '封禁'}
                  </Button>
                  <Button
                    className="action-btn"
                    size="mini"
                    onClick={() => handleResetPassword(u.id)}
                  >
                    重置密码
                  </Button>
                  {currentUser?.role === 1 && (u.role === 0 || u.role === 2) && (
                    <Button
                      className="action-btn role-btn"
                      size="mini"
                      onClick={() => handleUpdateRole(u.id, u.nickname || '该用户', u.role)}
                    >
                      {u.role === 2 ? '取消二级管理员' : '设为二级管理员'}
                    </Button>
                  )}
                  <Button
                    className="action-btn danger-btn"
                    size="mini"
                    onClick={() => handleDelete(u.id, u.nickname || '该用户')}
                  >
                    删除
                  </Button>
                </View>
              )}
            </View>
          )
        })}

        {loading && <View className="loading-text">加载中...</View>}
      </View>
    </View>
  )
}
