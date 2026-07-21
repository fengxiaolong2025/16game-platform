import { View, Text, Input, Textarea, Picker, Button } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { tournamentApi, registrationApi, teamApi } from '../../../../api'
import { formatText, participantTypeMap } from '../../../../utils'
import './index.scss'

interface Team {
  id: string
  name: string
  logo?: string
}

export default function Register() {
  const router = useRouter()
  const id = router.params.id
  const [tournament, setTournament] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number>(0)
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      const res = await tournamentApi.get(id)
      const tour = res.data as any
      setTournament(tour)

      // 如果是团队赛，获取用户作为队长的战队
      if (tour.participant_type === 'team') {
        try {
          const teamRes = await teamApi.myCaptainTeams()
          const teamData = (teamRes.data as any)?.items || (teamRes.data as any) || []
          setTeams(teamData)
        } catch {
          // 忽略
        }
      }
    } catch (err) {
      console.error('加载赛事失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useLoad(() => {
    fetchData()
  })

  const customFields = (tournament?.config?.customFields || []) as Array<{
    name: string
    type: 'text' | 'select'
    required: boolean
    options?: string[]
  }>

  const handleSubmit = async () => {
    if (submitting) return

    // 验证自定义字段
    for (const field of customFields) {
      if (field.required && !customValues[field.name]) {
        Taro.showToast({ title: `请填写${field.name}`, icon: 'none' })
        return
      }
    }

    // 团队赛验证
    if (tournament.participant_type === 'team' && teams.length === 0) {
      Taro.showToast({ title: '您还没有战队，请先创建', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const data: any = {
        type: tournament.participant_type || 'individual',
      }
      if (tournament.participant_type === 'team' && teams[selectedTeam]) {
        data.team_id = teams[selectedTeam].id
      }
      if (customFields.length > 0) {
        data.custom_fields = customValues
      }

      await registrationApi.register(id, data)
      Taro.showToast({ title: '报名成功', icon: 'success' })
      setTimeout(() => {
        Taro.navigateBack()
      }, 1500)
    } catch (err: any) {
      const msg = err?.data?.message || '报名失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View className="register-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!tournament) {
    return (
      <View className="register-page">
        <View className="empty-state">
          <Text>赛事不存在</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="register-page">
      {/* 赛事概要 */}
      <View className="tour-summary">
        <Text className="tour-title">{tournament.title}</Text>
        <View className="tour-meta">
          <Text className="meta-tag">{formatText(tournament.format)}</Text>
          <Text className="meta-tag">{participantTypeMap[tournament.participant_type] || '个人赛'}</Text>
          <Text className="meta-tag">👥 {tournament.max_participants}人上限</Text>
        </View>
      </View>

      {/* 团队赛 - 选择战队 */}
      {tournament.participant_type === 'team' && (
        <View className="form-section">
          <Text className="section-label">选择战队</Text>
          {teams.length === 0 ? (
            <View className="empty-team">
              <Text className="empty-text">您还不是任何战队的队长</Text>
              <Text
                className="create-team-link"
                onClick={() => Taro.navigateTo({ url: '/subpackages/team/pages/manage/index' })}
              >
                去创建战队 ›
              </Text>
            </View>
          ) : (
            <Picker
              mode="selector"
              range={teams}
              rangeKey="name"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(Number(e.detail.value))}
            >
              <View className="picker-value">
                {teams[selectedTeam]?.name || '请选择战队'}
                <Text className="picker-arrow">›</Text>
              </View>
            </Picker>
          )}
        </View>
      )}

      {/* 自定义字段 */}
      {customFields.length > 0 && (
        <View className="form-section">
          <Text className="section-label">报名信息</Text>
          {customFields.map((field) => (
            <View key={field.name} className="form-item">
              <Text className="form-label">
                {field.name}
                {field.required && <Text className="required">*</Text>}
              </Text>
              {field.type === 'select' && field.options ? (
                <Picker
                  mode="selector"
                  range={field.options}
                  value={field.options.indexOf(customValues[field.name] || '')}
                  onChange={(e) =>
                    setCustomValues({
                      ...customValues,
                      [field.name]: field.options![Number(e.detail.value)],
                    })
                  }
                >
                  <View className="picker-value">
                    {customValues[field.name] || '请选择'}
                    <Text className="picker-arrow">›</Text>
                  </View>
                </Picker>
              ) : (
                <Input
                  className="form-input"
                  placeholder={`请输入${field.name}`}
                  value={customValues[field.name] || ''}
                  onInput={(e) =>
                    setCustomValues({
                      ...customValues,
                      [field.name]: e.detail.value,
                    })
                  }
                />
              )}
            </View>
          ))}
        </View>
      )}

      {/* 报名说明 */}
      <View className="notice-card">
        <Text className="notice-title">📝 报名须知</Text>
        <Text className="notice-text">
          1. 报名后需等待管理员审核{'\n'}
          2. 审核通过后可在比赛开始时签到{'\n'}
          3. 请确保填写的信息准确无误
        </Text>
      </View>

      {/* 提交按钮 */}
      <View className="submit-bar">
        <Button
          className="btn-primary submit-btn"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '提交中...' : '确认报名'}
        </Button>
      </View>
    </View>
  )
}
