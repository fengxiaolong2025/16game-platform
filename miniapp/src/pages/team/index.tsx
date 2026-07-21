import { View, Text, Image } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { teamApi } from '../../api'
import { toAbsUrl } from '../../utils'
import './index.scss'

interface Team {
  id: string
  name: string
  logo?: string
  description?: string
  captain?: { nickname: string }
  member_count?: number
  games?: string[]
}

export default function TeamPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await teamApi.showcase()
      const data = (res.data as any) || []
      setTeams(Array.isArray(data) ? data : data.items || [])
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => {
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().then(() => Taro.stopPullDownRefresh())
  })

  const goToDetail = (id: string) => {
    Taro.navigateTo({ url: `/subpackages/team/pages/detail/index?id=${id}` })
  }

  const goToManage = () => {
    Taro.navigateTo({ url: '/subpackages/team/pages/manage/index' })
  }

  return (
    <View className="team-page">
      {/* 顶部操作栏 */}
      <View className="team-top-bar">
        <Text className="team-count">共 {teams.length} 支战队</Text>
        <Text className="team-manage-btn" onClick={goToManage}>我的战队 ›</Text>
      </View>

      {/* 战队列表 */}
      <View className="team-list">
        {teams.length === 0 && !loading && (
          <View className="empty-state">
            <Text>暂无战队</Text>
          </View>
        )}

        {teams.map((team) => (
          <View
            key={team.id}
            className="team-card"
            onClick={() => goToDetail(team.id)}
          >
            <Image
              className="team-logo"
              src={toAbsUrl(team.logo) || 'https://via.placeholder.com/96'}
              mode="aspectFill"
            />
            <View className="team-info">
              <Text className="team-name">{team.name}</Text>
              <Text className="team-desc">
                {team.description || '暂无简介'}
              </Text>
              <View className="team-meta">
                <Text className="team-meta-item">
                  👥 {team.member_count || 0}人
                </Text>
                {team.captain && (
                  <Text className="team-meta-item">
                    队长: {team.captain.nickname}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}

        {loading && <View className="loading-text">加载中...</View>}
      </View>
    </View>
  )
}
