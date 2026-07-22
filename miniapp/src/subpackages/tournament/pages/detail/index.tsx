import { View, Text, Button, RichText } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { tournamentApi, registrationApi, rankingApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { formatDate, tournamentStatusMap, formatText, participantTypeMap } from '../../../../utils'
import './index.scss'

export default function TournamentDetail() {
  const router = useRouter()
  const id = router.params.id
  const [tournament, setTournament] = useState<any>(null)
  const [myRegistration, setMyRegistration] = useState<any>(null)
  const [rankings, setRankings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await tournamentApi.get(id)
      setTournament(res.data as any)

      // 如果已登录，检查报名状态
      if (token) {
        try {
          const myRes = await registrationApi.my(id)
          setMyRegistration((myRes.data as any) || null)
        } catch {
          setMyRegistration(null)
        }
      }

      // 加载排名数据（赛事进行中或已完成时）
      const status = (res.data as any)?.status
      if (status === 'in_progress' || status === 'completed') {
        try {
          const rankRes = await rankingApi.get(id)
          setRankings((rankRes.data as any[]) || [])
        } catch {
          setRankings([])
        }
      }
    } catch (err) {
      console.error('加载赛事失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useLoad(() => {
    fetchData()
  })

  const formatText2 = (fmt: string) => formatText(fmt)

  const handleRegister = () => {
    if (!token) {
      Taro.showModal({
        title: '提示',
        content: '请先登录后再报名',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) Taro.reLaunch({ url: '/pages/login/index' })
        },
      })
      return
    }
    Taro.navigateTo({ url: `/subpackages/tournament/pages/register/index?id=${id}` })
  }

  const handleViewBracket = () => {
    Taro.navigateTo({ url: `/subpackages/tournament/pages/bracket/index?id=${id}` })
  }

  const handleManage = () => {
    Taro.navigateTo({ url: `/subpackages/tournament/pages/manage/index?id=${id}` })
  }

  const isCreator = user && tournament?.creator_id === user.id
  const isAdmin = (user?.role ?? 0) >= 1
  const canManage = isCreator || isAdmin

  if (loading) {
    return (
      <View className="detail-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!tournament) {
    return (
      <View className="detail-page">
        <View className="empty-state">
          <Text>赛事不存在</Text>
        </View>
      </View>
    )
  }

  const status = tournamentStatusMap[tournament.status] || { text: tournament.status, color: '#999' }
  const isRegistration = tournament.status === 'registration'
  const isOngoing = tournament.status === 'in_progress'
  const isCompleted = tournament.status === 'completed'

  return (
    <View className="detail-page">
      {/* 头部信息 */}
      <View className="detail-header">
        <Text className="detail-name">{tournament.title}</Text>
        <View className="detail-status-row">
          <Text className="tag" style={{ background: `${status.color}20`, color: status.color }}>
            {status.text}
          </Text>
          {tournament.participant_type && (
            <Text className="tag tag-info">{participantTypeMap[tournament.participant_type] || tournament.participant_type}</Text>
          )}
        </View>
      </View>

      {/* 基本信息 */}
      <View className="info-card">
        <View className="info-row">
          <Text className="info-label">赛制</Text>
          <Text className="info-value">{formatText2(tournament.format)}</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">游戏</Text>
          <Text className="info-value">{tournament.game || '通用'}</Text>
        </View>
        <View className="info-row">
          <Text className="info-label">报名人数</Text>
          <Text className="info-value">
            {tournament.current_participants || 0} / {tournament.max_participants || 0}
          </Text>
        </View>
        {tournament.start_at && (
          <View className="info-row">
            <Text className="info-label">开始时间</Text>
            <Text className="info-value">{formatDate(tournament.start_at)}</Text>
          </View>
        )}
        {tournament.end_at && (
          <View className="info-row">
            <Text className="info-label">结束时间</Text>
            <Text className="info-value">{formatDate(tournament.end_at)}</Text>
          </View>
        )}
        {tournament.registration_start_at && (
          <View className="info-row">
            <Text className="info-label">报名开始</Text>
            <Text className="info-value">{formatDate(tournament.registration_start_at)}</Text>
          </View>
        )}
        {tournament.registration_end_at && (
          <View className="info-row">
            <Text className="info-label">报名截止</Text>
            <Text className="info-value">{formatDate(tournament.registration_end_at)}</Text>
          </View>
        )}
        {tournament.organizer_name && (
          <View className="info-row">
            <Text className="info-label">主办方</Text>
            <Text className="info-value">{tournament.organizer_name}</Text>
          </View>
        )}
        {tournament.stage_name && (
          <View className="info-row">
            <Text className="info-label">当前阶段</Text>
            <Text className="info-value">{tournament.stage_name}</Text>
          </View>
        )}
      </View>

      {/* 赛事规则 */}
      {tournament.rules && (
        <View className="desc-card">
          <Text className="desc-title">赛事规则</Text>
          <RichText className="desc-content" nodes={tournament.rules} />
        </View>
      )}

      {/* 报名状态 */}
      {myRegistration && (
        <View className="reg-status-card">
          <Text className="reg-status-title">
            ✅ 已报名
          </Text>
          <Text className="reg-status-info">
            报名状态: {myRegistration.status === 'approved' ? '已通过' : myRegistration.status === 'pending' ? '审核中' : '未通过'}
          </Text>
          {myRegistration.status === 'approved' && tournament.status === 'in_progress' && (
            <Text className="reg-checkin">请按时参赛</Text>
          )}
        </View>
      )}

      {/* 排名信息 */}
      {rankings.length > 0 && (
        <View className="ranking-card">
          <Text className="ranking-title">战队排名</Text>
          <View className="ranking-table">
            <View className="ranking-header">
              <Text className="col-rank">排名</Text>
              <Text className="col-name">选手/战队</Text>
              <Text className="col-num">胜</Text>
              <Text className="col-num">负</Text>
              <Text className="col-num">净胜</Text>
              <Text className="col-num">积分</Text>
            </View>
            {rankings.map((r) => {
              const diff = (r.score_for || 0) - (r.score_against || 0)
              const medal = r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : null
              return (
                <View key={r.participant_id} className="ranking-row">
                  <Text className="col-rank">{medal || r.rank}</Text>
                  <Text className="col-name">{r.participant_name}</Text>
                  <Text className="col-num">{r.wins || 0}</Text>
                  <Text className="col-num">{r.losses || 0}</Text>
                  <Text className="col-num" style={{ color: diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#999' }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </Text>
                  <Text className="col-num col-score">{r.score || 0}</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* 操作按钮 */}
      <View className="action-bar">
        {isRegistration && !myRegistration && (
          <Button className="btn-primary action-btn" onClick={handleRegister}>
            立即报名
          </Button>
        )}
        {isRegistration && myRegistration && (
          <Button className="action-btn action-btn-disabled" disabled>
            已报名
          </Button>
        )}
        {(isOngoing || isCompleted) && (
          <Button className="btn-primary action-btn" onClick={handleViewBracket}>
            查看对阵图
          </Button>
        )}
        {canManage && (
          <Button className="action-btn action-btn-outline" onClick={handleManage}>
            管理赛事
          </Button>
        )}
      </View>
    </View>
  )
}
