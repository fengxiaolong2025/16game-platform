import { View, Text, ScrollView, Input, Image } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { communityApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'general', label: '综合' },
  { key: 'tournament', label: '赛事' },
  { key: 'team', label: '战队' },
  { key: 'looking_for_team', label: '找队友' },
  { key: 'off_topic', label: '闲聊' },
]

export default function Square() {
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [keyword, setKeyword] = useState('')
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const fetchData = useCallback(async (isRefresh = false, category?: string) => {
    const currentPage = isRefresh ? 1 : page
    const cat = category !== undefined ? category : activeCategory
    setLoading(true)
    try {
      const res = await communityApi.listPosts({
        page: currentPage,
        limit: 20,
        category: cat,
        keyword: keyword || undefined,
      })
      const newPosts = (res.data as any)?.items || []
      if (isRefresh) {
        setPosts(newPosts)
        setPage(1)
      } else {
        setPosts((prev) => [...prev, ...newPosts])
        setPage(currentPage + 1)
      }
      setHasMore(newPosts.length >= 20)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [page, activeCategory, keyword])

  useLoad(() => {
    fetchData(true)
  })

  usePullDownRefresh(() => {
    fetchData(true).then(() => Taro.stopPullDownRefresh())
  })

  useReachBottom(() => {
    if (hasMore && !loading) fetchData()
  })

  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat)
    fetchData(true, cat)
  }

  const handleSearch = () => {
    fetchData(true)
  }

  const goToPost = (id: string) => {
    Taro.navigateTo({ url: `/subpackages/community/pages/post/index?id=${id}` })
  }

  const goToPublish = () => {
    if (!token) {
      Taro.showModal({
        title: '提示',
        content: '请先登录后发帖',
        confirmText: '去登录',
        success: (res) => { if (res.confirm) Taro.reLaunch({ url: '/pages/login/index' }) },
      })
      return
    }
    Taro.navigateTo({ url: '/subpackages/community/pages/publish/index' })
  }

  const goToUser = (userId: string) => {
    Taro.navigateTo({ url: `/subpackages/community/pages/user/index?id=${userId}` })
  }

  const categoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.key === cat)?.label || cat
  }

  return (
    <View className="square-page">
      {/* 搜索栏 */}
      <View className="search-bar">
        <Input
          className="search-input"
          placeholder="搜索帖子..."
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={handleSearch}
          confirmType="search"
        />
        <Text className="search-btn" onClick={handleSearch}>搜索</Text>
      </View>

      {/* 分类标签 */}
      <ScrollView scrollX className="category-bar" showScrollbar={false}>
        {CATEGORIES.map((cat) => (
          <View
            key={cat.key}
            className={`category-item ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => handleCategoryChange(cat.key)}
          >
            {cat.label}
          </View>
        ))}
      </ScrollView>

      {/* 帖子列表 */}
      <View className="post-list">
        {posts.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无帖子，快来发第一帖吧！</Text>
          </View>
        )}

        {posts.map((post) => (
          <View key={post.id} className="post-card" onClick={() => goToPost(post.id)}>
            <View className="post-header">
              <Image
                className="author-avatar"
                src={toAbsUrl(post.author?.avatar) || 'https://via.placeholder.com/64'}
                mode="aspectFill"
                onClick={(e) => { e.stopPropagation(); goToUser(post.author_id) }}
              />
              <View className="author-info">
                <Text className="author-name">{post.author?.nickname || '匿名'}</Text>
                <Text className="post-time">{formatDate(post.created_at)}</Text>
              </View>
              <Text className="post-category">{categoryLabel(post.category)}</Text>
            </View>
            <Text className="post-title">{post.title}</Text>
            <Text className="post-content-preview" numberOfLines={2}>
              {post.content}
            </Text>
            {post.images && post.images.length > 0 && (
              <View className="post-images">
                {post.images.slice(0, 3).map((img: string, idx: number) => (
                  <Image key={idx} className="post-image" src={toAbsUrl(img)} mode="aspectFill" />
                ))}
                {post.images.length > 3 && (
                  <View className="image-more">+{post.images.length - 3}</View>
                )}
              </View>
            )}
            <View className="post-footer">
              <Text className="footer-item">👁 {post.view_count || 0}</Text>
              <Text className="footer-item">💬 {post.comment_count || 0}</Text>
              <Text className="footer-item">❤️ {post.like_count || 0}</Text>
            </View>
          </View>
        ))}

        {loading && <View className="loading-text">加载中...</View>}
        {!hasMore && posts.length > 0 && <View className="loading-text">没有更多了</View>}
      </View>

      {/* 发帖按钮 */}
      <View className="fab-btn" onClick={goToPublish}>
        <Text className="fab-icon">✏️</Text>
      </View>
    </View>
  )
}
