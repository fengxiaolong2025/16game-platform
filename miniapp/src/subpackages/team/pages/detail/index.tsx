import { View, Text, Image, Button } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { teamApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

export default function TeamDetail() {
  const router = useRouter()
  const id = router.params.id
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const [teamRes, memberRes] = await Promise.all([
        teamApi.get(id),
        teamApi.members(id),
      ])
      setTeam(teamRes.data as any)
      const memberData = (memberRes.data as any)?.items || (memberRes.data as any) || []
      setMembers(memberData)
    } catch (err) {
      console.error('加载失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useLoad(() => {
    fetchData()
  })

  const isCaptain = user && team?.captain_id === user.id
  const isMember = members.some((m) => m.user_id === user?.id && m.status === 'approved')

  const handleJoin = async () => {
    if (!token) {
      Taro.showModal({
        title: '提示',
        content: '请先登录后加入战队',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) Taro.reLaunch({ url: '/pages/login/index' })
        },
      })
      return
    }
    try {
      await teamApi.joinById(id)
      Taro.showToast({ title: '申请已提交', icon: 'success' })
      fetchData()
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
    }
  }

  const handleLeave = () => {
    Taro.showModal({
      title: '退出战队',
      content: '确认退出该战队？',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await teamApi.leaveTeam(id)
          Taro.showToast({ title: '已退出', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleManage = () => {
    Taro.navigateTo({ url: `/subpackages/team/pages/manage/index?id=${id}` })
  }

  if (loading) {
    return (
      <View className="team-detail-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!team) {
    return (
      <View className="team-detail-page">
        <View className="empty-state">
          <Text>战队不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="team-detail-page">
      {/* 头部 */}
      <View className="team-header">
        <Image
          className="team-logo"
          src={toAbsUrl(team.logo) || 'https://via.placeholder.com/120'}
          mode="aspectFill"
        />
        <View className="team-info">
          <View className="team-name-row">
            <Text className="team-name">{team.name}</Text>
            {team.tag && <Text className="team-tag">[{team.tag}]</Text>}
          </View>
          <Text className="team-captain">
            队长: {team.captain?.nickname || '未知'}
          </Text>
          <Text className="team-count">👥 {team.member_count || members.length} 人</Text>
        </View>
      </View>

      {/* 简介 */}
      {team.description && (
        <View className="info-card">
          <Text className="card-title">战队简介</Text>
          <Text className="card-content">{team.description}</Text>
        </View>
      )}

      {/* 成就 */}
      {team.achievement && (
        <View className="info-card">
          <Text className="card-title">🏆 战队成就</Text>
          <Text className="card-content">{team.achievement}</Text>
        </View>
      )}

      {/* 照片墙 */}
      {team.photos && team.photos.length > 0 && (
        <View className="info-card">
          <Text className="card-title">战队风采</Text>
          <View className="photo-grid">
            {team.photos.map((photo: string, idx: number) => (
              <Image
                key={idx}
                className="photo-item"
                src={toAbsUrl(photo)}
                mode="aspectFill"
                onClick={() => Taro.previewImage({ urls: team.photos.map((p: string) => toAbsUrl(p)), current: toAbsUrl(photo) })}
              />
            ))}
          </View>
        </View>
      )}

      {/* 成员列表 */}
      <View className="info-card">
        <Text className="card-title">成员列表 ({members.length})</Text>
        {members.length === 0 ? (
          <Text className="empty-text">暂无成员</Text>
        ) : (
          <View className="member-list">
            {members.map((member) => (
              <View key={member.id} className="member-item">
                <Image
                  className="member-avatar"
                  src={toAbsUrl(member.user?.avatar) || 'https://via.placeholder.com/64'}
                  mode="aspectFill"
                />
                <View className="member-info">
                  <View className="member-name-row">
                    <Text className="member-name">{member.user?.nickname || '未知'}</Text>
                    {member.role === 'captain' && <Text className="role-tag captain-tag">队长</Text>}
                    {member.role === 'member' && <Text className="role-tag">队员</Text>}
                  </View>
                  <Text className="member-join-time">加入: {formatDate(member.joined_at)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 操作按钮 */}
      <View className="action-bar">
        {isCaptain ? (
          <Button className="btn-primary action-btn" onClick={handleManage}>
            管理战队
          </Button>
        ) : isMember ? (
          <Button className="action-btn action-btn-danger" onClick={handleLeave}>
            退出战队
          </Button>
        ) : (
          <Button className="btn-primary action-btn" onClick={handleJoin}>
            申请加入
          </Button>
        )}
      </View>
    </View>
  )
}
