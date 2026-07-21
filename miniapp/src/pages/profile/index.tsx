import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useAuthStore } from '../../store/auth'
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

  useLoad(() => {
    if (token) {
      fetchUser()
    }
  })

  const menuItems = [
    { icon: '📋', text: '我的报名', url: '/subpackages/tournament/pages/manage/index?type=participated' },
    { icon: '👥', text: '我的战队', url: '/subpackages/team/pages/manage/index' },
    { icon: '🏅', text: '光荣榜', url: '/subpackages/data/pages/honor-roll/index' },
    { icon: '🎮', text: '选手展示', url: '/subpackages/data/pages/players/index' },
    { icon: '💬', text: '社区广场', url: '/subpackages/community/pages/square/index' },
  ]

  const adminItems = user?.role === 1 ? [
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
                <Text className="tag tag-danger" style={{ marginLeft: '12rpx' }}>管理员</Text>
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
          onClick={() => goToPage('/subpackages/team/pages/manage/index')}
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
