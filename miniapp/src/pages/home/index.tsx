import { View, Text, Image, ScrollView, Button } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { tournamentApi, announcementApi } from '../../api'
import { useAuthStore } from '../../store/auth'
import { toAbsUrl, formatDate, tournamentStatusMap, formatText } from '../../utils'
import './index.scss'

interface Tournament {
  id: string
  title: string
  status: string
  format: string
  game?: string
  max_participants?: number
  current_participants?: number
  start_at?: string
  organizer_name?: string
  creator_id?: string
}

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned?: boolean
}

export default function Home() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  const fetchData = useCallback(async (isRefresh = false) => {
    const currentPage = isRefresh ? 1 : page
    try {
      setLoading(true)
      const [tourRes, annRes] = await Promise.all([
        tournamentApi.list({ page: currentPage, limit: 10 }),
        announcementApi.list({ page: 1, limit: 5 }),
      ])
      const newTournaments = (tourRes.data as any)?.items || (tourRes.data as any) || []
      const annData = (annRes.data as any)?.items || (annRes.data as any) || []

      if (isRefresh) {
        setTournaments(newTournaments)
        setAnnouncements(annData)
        setPage(1)
        setHasMore(newTournaments.length >= 10)
      } else {
        setTournaments((prev) => [...prev, ...newTournaments])
        setPage(currentPage + 1)
        setHasMore(newTournaments.length >= 10)
      }
    } catch (err) {
      console.error('加载数据失败', err)
    } finally {
      setLoading(false)
    }
  }, [page])

  useLoad(() => {
    // 如果已登录，静默拉取最新用户信息
    if (token) {
      fetchUser()
    }
    fetchData(true)
  })

  usePullDownRefresh(() => {
    fetchData(true).then(() => Taro.stopPullDownRefresh())
  })

  useReachBottom(() => {
    if (hasMore && !loading) {
      fetchData()
    }
  })

  const goToDetail = (id: string) => {
    Taro.navigateTo({ url: `/subpackages/tournament/pages/detail/index?id=${id}` })
  }

  const goToCreate = () => {
    const role = user?.role
    if ((role ?? 0) < 1) {
      Taro.showToast({ title: '仅管理员可创建赛事', icon: 'none' })
      return
    }
    Taro.navigateTo({ url: '/subpackages/tournament/pages/create/index' })
  }

  return (
    <View className="home-page">
      {/* 顶部欢迎栏 */}
      <View className="home-header">
        <View className="flex-between">
          <View>
            <Text className="welcome-text">{user?.nickname || '电竞爱好者'}</Text>
            <Text className="welcome-sub">{token ? '欢迎来到电竞平台' : '登录后体验更多功能'}</Text>
          </View>
          {token ? (
            <Image
              className="user-avatar"
              src={toAbsUrl(user?.avatar) || 'https://via.placeholder.com/80'}
              mode="aspectFill"
            />
          ) : (
            <Button
              className="login-btn-header"
              size="mini"
              onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}
            >
              登录
            </Button>
          )}
        </View>
      </View>

      {/* 未登录引导 */}
      {!token && (
        <View className="login-banner" onClick={() => Taro.navigateTo({ url: '/pages/login/index' })}>
          <View className="login-banner-content">
            <Text className="login-banner-title">🎮 欢迎使用电竞赛事平台</Text>
            <Text className="login-banner-desc">微信一键登录，参与赛事、组建战队、社区交流</Text>
          </View>
          <Text className="login-banner-arrow">去登录 ›</Text>
        </View>
      )}

      {/* 公告栏 */}
      {announcements.length > 0 && (
        <View className="announcement-bar">
          <Text className="announce-icon">📢</Text>
          <ScrollView scrollX className="announce-scroll" enhanced showScrollbar={false}>
            {announcements.map((ann) => (
              <Text
                key={ann.id}
                className="announce-item"
                onClick={() => Taro.navigateTo({ url: `/subpackages/announcement/pages/detail/index?id=${ann.id}` })}
              >
                {ann.is_pinned ? '【置顶】' : ''}{ann.title}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 快捷入口 */}
      <View className="quick-entry">
        <View className="entry-item" onClick={goToCreate}>
          <View className="entry-icon entry-icon-create">🏆</View>
          <Text className="entry-text">创建赛事</Text>
        </View>
        <View
          className="entry-item"
          onClick={() => Taro.navigateTo({ url: '/subpackages/tournament/pages/manage/index' })}
        >
          <View className="entry-icon entry-icon-my">📋</View>
          <Text className="entry-text">我的赛事</Text>
        </View>
        <View
          className="entry-item"
          onClick={() => Taro.switchTab({ url: '/pages/team/index' })}
        >
          <View className="entry-icon entry-icon-team">👥</View>
          <Text className="entry-text">战队</Text>
        </View>
        <View
          className="entry-item"
          onClick={() => Taro.navigateTo({ url: '/subpackages/data/pages/honor-roll/index' })}
        >
          <View className="entry-icon entry-icon-honor">🏅</View>
          <Text className="entry-text">光荣榜</Text>
        </View>
      </View>

      {/* 赛事列表 */}
      <View className="section">
        <View className="flex-between mb-16">
          <Text className="section-title">赛事大厅</Text>
          <Text
            className="text-sm text-gray"
            onClick={() => Taro.switchTab({ url: '/pages/match/index' })}
          >
            全部 ›
          </Text>
        </View>

        {tournaments.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无赛事</Text>
          </View>
        )}

        {tournaments.map((tour) => {
          const status = tournamentStatusMap[tour.status] || { text: tour.status, color: '#999' }
          return (
            <View
              key={tour.id}
              className="tournament-card"
              onClick={() => goToDetail(tour.id)}
            >
              <View className="flex-between">
                <Text className="tour-name">{tour.title}</Text>
                <Text className="tag" style={{ background: `${status.color}15`, color: status.color }}>
                  {status.text}
                </Text>
              </View>
              <View className="tour-info">
                <Text className="tour-info-item">🎮 {tour.game || '通用'}</Text>
                <Text className="tour-info-item">📊 {formatText(tour.format)}</Text>
              </View>
              <View className="tour-info">
                <Text className="tour-info-item">
                  👥 {tour.current_participants || 0}/{tour.max_participants || 0}人
                </Text>
                {tour.start_at && (
                  <Text className="tour-info-item">🕐 {formatDate(tour.start_at)}</Text>
                )}
              </View>
              {tour.organizer_name && (
                <Text className="tour-creator">主办方: {tour.organizer_name}</Text>
              )}
            </View>
          )
        })}

        {loading && <View className="loading-text">加载中...</View>}
        {!hasMore && tournaments.length > 0 && (
          <View className="loading-text">没有更多了</View>
        )}
      </View>
    </View>
  )
}
