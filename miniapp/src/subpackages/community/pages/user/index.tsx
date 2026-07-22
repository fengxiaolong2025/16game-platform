import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { authApi, communityApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

const POSITION_MAP: Record<string, string> = {
  top: '上路', mid: '中路', jungle: '打野', adc: '下路', support: '辅助',
}

export default function UserPage() {
  const router = useRouter()
  const id = router.params.id
  const currentUser = useAuthStore((s) => s.user)

  const [user, setUser] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [userRes, postsRes] = await Promise.all([
        authApi.getUser(id),
        communityApi.getUserPosts(id),
      ])
      setUser(userRes.data as any)
      const postData = (postsRes.data as any) || []
      setPosts(Array.isArray(postData) ? postData : postData.items || [])
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useLoad(() => {
    fetchData()
  })

  const goToPost = (postId: string) => {
    Taro.navigateTo({ url: `/subpackages/community/pages/post/index?id=${postId}` })
  }

  const goToSquare = () => {
    Taro.navigateTo({ url: '/subpackages/community/pages/square/index' })
  }

  if (loading) {
    return (
      <View className="user-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!user) {
    return (
      <View className="user-page">
        <View className="empty-state"><Text>用户不存在</Text></View>
      </View>
    )
  }

  const isSelf = currentUser?.id === user.id

  return (
    <View className="user-page">
      {/* 用户信息卡片 */}
      <View className="user-header">
        <Image
          className="user-avatar"
          src={toAbsUrl(user.avatar) || 'https://via.placeholder.com/120'}
          mode="aspectFill"
        />
        <View className="user-info">
          <View className="user-name-row">
            <Text className="user-name">{user.nickname || '未设置'}</Text>
            {user.role === 1 && <Text className="admin-tag">超级管理员</Text>}
            {user.role === 2 && <Text className="admin-tag" style={{ background: '#fff3e0', color: '#ff9800' }}>二级管理员</Text>}
          </View>
          {user.bio && <Text className="user-bio">{user.bio}</Text>}
          <View className="user-tags">
            {user.position && (
              <Text className="user-tag">{POSITION_MAP[user.position] || user.position}</Text>
            )}
            {user.ladder_score != null && (
              <Text className="user-tag">⚡ {user.ladder_score}</Text>
            )}
            {user.games && user.games.length > 0 && (
              <Text className="user-tag">🎮 {user.games.join('/')}</Text>
            )}
          </View>
          <Text className="user-join">加入于 {formatDate(user.created_at)}</Text>
        </View>
      </View>

      {/* 选手照片 */}
      {user.player_photos && user.player_photos.length > 0 && (
        <View className="photo-section">
          <Text className="section-title">选手风采</Text>
          <View className="photo-grid">
            {user.player_photos.map((photo: string, idx: number) => (
              <Image
                key={idx}
                className="photo-item"
                src={toAbsUrl(photo)}
                mode="aspectFill"
                onClick={() => Taro.previewImage({
                  urls: user.player_photos.map((p: string) => toAbsUrl(p)),
                  current: toAbsUrl(photo),
                })}
              />
            ))}
          </View>
        </View>
      )}

      {/* 帖子列表 */}
      <View className="posts-section">
        <View className="section-header">
          <Text className="section-title">TA的帖子 ({posts.length})</Text>
          <Text className="see-all" onClick={goToSquare}>社区 ›</Text>
        </View>

        {posts.length === 0 ? (
          <View className="empty-posts">
            <Text>暂无帖子</Text>
          </View>
        ) : (
          <View className="post-list">
            {posts.map((post) => (
              <View key={post.id} className="post-card" onClick={() => goToPost(post.id)}>
                <Text className="post-title">{post.title}</Text>
                <Text className="post-preview" numberOfLines={2}>{post.content}</Text>
                <View className="post-footer">
                  <Text className="footer-item">👁 {post.view_count || 0}</Text>
                  <Text className="footer-item">💬 {post.comment_count || 0}</Text>
                  <Text className="footer-item">❤️ {post.like_count || 0}</Text>
                  <Text className="footer-time">{formatDate(post.created_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}
