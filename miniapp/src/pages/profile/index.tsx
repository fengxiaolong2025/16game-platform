import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useAuthStore } from '../../store/auth'
import { authApi } from '../../api'
import { toAbsUrl } from '../../utils'
import './index.scss'

export default function Profile() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const logout = useAuthStore((s) => s.logout)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout()
          Taro.reLaunch({ url: '/pages/login/index' })
        }
      },
    })
  }

  const handleUnbindWechat = () => {
    Taro.showModal({
      title: '解绑微信',
      content: '解绑后，该微信将无法直接登录当前账号。如需再次使用微信登录，需重新绑定。确定要解绑吗？',
      confirmText: '确认解绑',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await authApi.unbindWechat()
          Taro.showToast({ title: '微信解绑成功', icon: 'success' })
          await fetchUser()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '解绑失败', icon: 'none' })
        }
      },
    })
  }

  useLoad(() => {
    if (token) {
      fetchUser()
    }
  })

  const previewPhotos = () => {
    if (user?.player_photos?.length > 0) {
      Taro.previewImage({ urls: user.player_photos.map((p) => toAbsUrl(p)) })
    }
  }

  const menuItems = [
    { icon: '📋', text: '我的报名', url: '/subpackages/tournament/pages/manage/index?type=participated' },
    { icon: '👥', text: '我的战队', url: '/subpackages/team/pages/manage/index' },
    { icon: '🏅', text: '光荣榜', url: '/subpackages/data/pages/honor-roll/index' },
    { icon: '🎮', text: '选手展示', url: '/subpackages/data/pages/players/index' },
    { icon: '💬', text: '社区广场', url: '/subpackages/community/pages/square/index' },
  ]

  const adminItems = (user?.role ?? 0) >= 1 ? [
    { icon: '🏆', text: '创建赛事', url: '/subpackages/tournament/pages/create/index' },
    { icon: '📢', text: '公告管理', url: '/subpackages/admin/pages/announcement/index' },
    { icon: '👤', text: '用户管理', url: '/subpackages/admin/pages/users/index' },
  ] : []

  const goToPage = (url: string) => {
    Taro.navigateTo({ url })
  }

  if (!token) {
    return (
      <View className="profile-page">
        <View className="empty-state">
          <Text>请先登录</Text>
          <Button
            className="btn-primary"
            style={{ marginTop: '24rpx', width: '300rpx' }}
            onClick={() => Taro.reLaunch({ url: '/pages/login/index' })}
          >
            去登录
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="profile-page">
      {/* 用户信息卡片 */}
      <View className="profile-header">
        <View className="profile-user">
          <Image
            className="profile-avatar"
            src={toAbsUrl(user?.avatar) || 'https://via.placeholder.com/120'}
            mode="aspectFill"
          />
          <View className="profile-info">
            <View className="flex" style={{ alignItems: 'center' }}>
              <Text className="profile-name">{user?.nickname || '未设置'}</Text>
              {user?.role === 1 && (
                <Text className="tag tag-danger" style={{ marginLeft: '12rpx' }}>超级管理员</Text>
              )}
              {user?.role === 2 && (
                <Text className="tag" style={{ marginLeft: '12rpx', background: '#fff3e0', color: '#ff9800' }}>二级管理员</Text>
              )}
            </View>
            <Text className="profile-bio">{user?.bio || '这个人很懒，什么都没写'}</Text>
            {user?.games && user.games.length > 0 && (
              <View className="profile-games">
                {user.games.map((g) => (
                  <Text key={g} className="tag tag-info">{g}</Text>
                ))}
              </View>
            )}
          </View>
        </View>
        <Text
          className="edit-btn"
          onClick={() => goToPage('/subpackages/profile/pages/edit/index')}
        >
          编辑资料
        </Text>
      </View>

      {/* 个人数据 */}
      <View className="profile-stats">
        <View className="stat-item">
          <Text className="stat-value">{user?.ladder_score || 0}</Text>
          <Text className="stat-label">天梯分</Text>
        </View>
        <View className="stat-divider" />
        <View className="stat-item">
          <Text className="stat-value">{user?.game_ids || '-'}</Text>
          <Text className="stat-label">游戏ID</Text>
        </View>
        <View className="stat-divider" />
        <View className="stat-item">
          <Text className="stat-value">{user?.position || '-'}</Text>
          <Text className="stat-label">位置</Text>
        </View>
      </View>

      {/* 个人照片 */}
      {user?.player_photos && user.player_photos.length > 0 && (
        <View className="profile-photos-section">
          <Text className="photos-title">个人照片</Text>
          <View className="photos-grid">
            {user.player_photos.slice(0, 6).map((photo, idx) => (
              <Image
                key={idx}
                className="photo-thumb"
                src={toAbsUrl(photo)}
                mode="aspectFill"
                onClick={previewPhotos}
              />
            ))}
          </View>
        </View>
      )}

      {/* 微信绑定状态 */}
      <View className="wechat-bind-section">
        <View className="wechat-bind-info">
          <Text className="wechat-bind-label">微信账号</Text>
          {user?.wechat_union_id ? (
            <Text className="wechat-bind-status wechat-bound">已绑定</Text>
          ) : (
            <Text className="wechat-bind-status wechat-unbound">未绑定</Text>
          )}
        </View>
        {user?.wechat_union_id && (
          <Button
            className="unbind-btn"
            size="mini"
            onClick={handleUnbindWechat}
          >
            解绑
          </Button>
        )}
      </View>

      {/* 功能菜单 */}
      <View className="menu-section">
        {menuItems.map((item, idx) => (
          <View
            key={idx}
            className="menu-item"
            onClick={() => goToPage(item.url)}
          >
            <Text className="menu-icon">{item.icon}</Text>
            <Text className="menu-text">{item.text}</Text>
            <Text className="menu-arrow">›</Text>
          </View>
        ))}
      </View>

      {/* 管理员菜单 */}
      {adminItems.length > 0 && (
        <View className="menu-section">
          <Text className="menu-section-title">管理后台</Text>
          {adminItems.map((item, idx) => (
            <View
              key={idx}
              className="menu-item"
              onClick={() => goToPage(item.url)}
            >
              <Text className="menu-icon">{item.icon}</Text>
              <Text className="menu-text">{item.text}</Text>
              <Text className="menu-arrow">›</Text>
            </View>
          ))}
        </View>
      )}

      {/* 退出登录 */}
      <View className="logout-section">
        <Button className="logout-btn" onClick={handleLogout}>
          退出登录
        </Button>
      </View>
    </View>
  )
}
