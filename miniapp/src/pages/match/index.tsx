import { View, Text } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { tournamentApi } from '../../api'
import { formatDate, tournamentStatusMap, formatText } from '../../utils'
import './index.scss'

interface Tournament {
  id: string
  title: string
  status: string
  format: string
  game?: string
  start_at?: string
  current_participants?: number
}

export default function Match() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'in_progress' | 'registration' | 'completed'>('in_progress')

  const fetchData = useCallback(async (status?: string) => {
    setLoading(true)
    try {
      const res = await tournamentApi.list({ status: status || activeTab })
      const data = (res.data as any)?.items || (res.data as any) || []
      setTournaments(data)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useLoad(() => {
    fetchData('in_progress')
  })

  usePullDownRefresh(() => {
    fetchData().then(() => Taro.stopPullDownRefresh())
  })

  const handleTabChange = (tab: 'in_progress' | 'registration' | 'completed') => {
    setActiveTab(tab)
    fetchData(tab)
  }

  const goToBracket = (id: string) => {
    Taro.navigateTo({ url: `/subpackages/tournament/pages/bracket/index?id=${id}` })
  }

  const goToDetail = (id: string) => {
    Taro.navigateTo({ url: `/subpackages/tournament/pages/detail/index?id=${id}` })
  }

  return (
    <View className="match-page">
      {/* 状态筛选 */}
      <View className="tab-bar">
        <View
          className={`tab-item ${activeTab === 'in_progress' ? 'active' : ''}`}
          onClick={() => handleTabChange('in_progress')}
        >
          进行中
        </View>
        <View
          className={`tab-item ${activeTab === 'registration' ? 'active' : ''}`}
          onClick={() => handleTabChange('registration')}
        >
          报名中
        </View>
        <View
          className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => handleTabChange('completed')}
        >
          已结束
        </View>
      </View>

      {/* 赛事列表 */}
      <View className="match-list">
        {tournaments.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无赛事</Text>
          </View>
        )}

        {tournaments.map((tour) => {
          const status = tournamentStatusMap[tour.status] || { text: tour.status, color: '#999' }
          return (
            <View key={tour.id} className="match-card">
              <View className="match-card-header" onClick={() => goToDetail(tour.id)}>
                <Text className="match-name">{tour.title}</Text>
                <Text className="tag" style={{ background: `${status.color}15`, color: status.color }}>
                  {status.text}
                </Text>
              </View>
              <View className="match-card-body">
                <Text className="match-info-item">📊 {formatText(tour.format)}</Text>
                <Text className="match-info-item">👥 {tour.current_participants || 0}人</Text>
                {tour.start_at && (
                  <Text className="match-info-item">🕐 {formatDate(tour.start_at)}</Text>
                )}
              </View>
              <View className="match-card-footer">
                <Text
                  className="match-action-btn"
                  onClick={() => goToBracket(tour.id)}
                >
                  查看对阵图 ›
                </Text>
              </View>
            </View>
          )
        })}

        {loading && <View className="loading-text">加载中...</View>}
      </View>
    </View>
  )
}
