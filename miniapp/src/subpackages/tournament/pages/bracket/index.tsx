import { View, Text } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { bracketApi, matchApi, tournamentApi } from '../../../../api'
import BracketTree, { MatchResult } from '../../../../components/BracketTree'
import { formatDate } from '../../../../utils'
import './index.scss'

export default function BracketPage() {
  const router = useRouter()
  const id = router.params.id
  const [bracket, setBracket] = useState<any>(null)
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [tournament, setTournament] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      // 并行获取赛事信息、对阵图、比赛列表
      const [tourRes, bracketRes] = await Promise.all([
        tournamentApi.get(id),
        bracketApi.get(id).catch(() => null),
      ])

      setTournament(tourRes.data as any)

      if (bracketRes?.data) {
        const bracketData = bracketRes.data as any
        setBracket(bracketData)

        // 获取比赛结果
        try {
          const matchRes = await matchApi.list(id)
          const matchData = (matchRes.data as any) || []
          setMatches(Array.isArray(matchData) ? matchData : matchData.items || [])
        } catch {
          setMatches([])
        }
      }
    } catch (err) {
      console.error('加载对阵图失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useLoad(() => {
    fetchData()
  })

  const handleMatchClick = (slot: any, result: MatchResult | null) => {
    if (!result) {
      Taro.showToast({ title: '比赛尚未开始', icon: 'none' })
      return
    }
    // 显示比赛详情
    const a = result.participant_a_id || slot.participant_a?.name || '待定'
    const b = result.participant_b_id || slot.participant_b?.name || '待定'
    const statusText = {
      pending: '未开始',
      live: '进行中',
      completed: '已结束',
      cancelled: '已取消',
    }[result.status] || result.status

    Taro.showModal({
      title: '比赛详情',
      content: `${slot.participant_a?.name || '待定'} VS ${slot.participant_b?.name || '待定'}\n` +
        `状态: ${statusText}\n` +
        (result.score_a !== undefined ? `比分: ${result.score_a} - ${result.score_b}\n` : '') +
        (result.scheduled_at ? `时间: ${formatDate(result.scheduled_at)}\n` : ''),
      showCancel: false,
    })
  }

  if (loading) {
    return (
      <View className="bracket-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!bracket) {
    return (
      <View className="bracket-page">
        <View className="empty-state">
          <Text className="empty-icon">🏆</Text>
          <Text className="empty-text">对阵图尚未生成</Text>
          <Text className="empty-desc">
            {tournament?.status === 'registration'
              ? '赛事仍在报名中，待报名结束后生成对阵'
              : '请等待管理员生成对阵图'}
          </Text>
        </View>
      </View>
    )
  }

  const formatText = {
    single_elimination: '单淘汰',
    double_elimination: '双淘汰',
    round_robin: '循环赛',
  }[bracket.type] || bracket.type

  return (
    <View className="bracket-page">
      {/* 顶部信息 */}
      <View className="bracket-header">
        <Text className="bracket-title">{tournament?.title || '赛事对阵'}</Text>
        <View className="bracket-meta">
          <Text className="bracket-type">{formatText}</Text>
          <Text className="bracket-status">
            {bracket.status === 'published' ? '已发布' : '草稿'}
          </Text>
        </View>
      </View>

      {/* 图例 */}
      <View className="bracket-legend">
        <View className="legend-item">
          <View className="legend-color legend-win" />
          <Text className="legend-text">胜者</Text>
        </View>
        <View className="legend-item">
          <View className="legend-color legend-live" />
          <Text className="legend-text">进行中</Text>
        </View>
        <View className="legend-item">
          <View className="legend-color legend-pending" />
          <Text className="legend-text">待定</Text>
        </View>
      </View>

      {/* 对阵图 */}
      <BracketTree
        rounds_data={bracket.rounds_data || []}
        type={bracket.type}
        matches={matches}
        onMatchClick={handleMatchClick}
      />

      {/* 提示 */}
      <View className="bracket-tip">
        <Text className="tip-text">💡 点击对阵卡片查看比赛详情</Text>
      </View>
    </View>
  )
}
