import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { tournamentApi, registrationApi, bracketApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { formatDate, tournamentStatusMap, formatText, participantTypeMap } from '../../../../utils'
import './index.scss'

const STATUS_FLOW = [
  { value: 'draft', label: '草稿', next: 'registration', nextLabel: '发布报名' },
  { value: 'registration', label: '报名中', next: 'bracket', nextLabel: '生成对阵' },
  { value: 'bracket', label: '对阵生成中', next: 'in_progress', nextLabel: '开始比赛' },
  { value: 'in_progress', label: '进行中', next: 'completed', nextLabel: '结束赛事' },
  { value: 'completed', label: '已结束', next: null, nextLabel: '' },
]

const REG_STATUS_MAP: Record<string, { text: string; color: string }> = {
  submitted: { text: '待审核', color: '#ff9800' },
  approved: { text: '已通过', color: '#4caf50' },
  rejected: { text: '已拒绝', color: '#f44336' },
  checked_in: { text: '已签到', color: '#2196f3' },
  withdrawn: { text: '已撤回', color: '#999' },
}

export default function ManageTournament() {
  const router = useRouter()
  const id = router.params.id
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [tournament, setTournament] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'approved' | 'rejected'>('all')

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const [tourRes, regRes] = await Promise.all([
        tournamentApi.get(id),
        token ? registrationApi.list(id) : Promise.resolve({ data: [] }),
      ])
      setTournament(tourRes.data as any)
      const regData = (regRes.data as any)?.items || (regRes.data as any) || []
      setRegistrations(regData)
    } catch (err) {
      console.error('加载数据失败', err)
      Taro.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }, [id, token])

  useLoad(() => {
    fetchData()
  })

  const isCreator = user && tournament?.creator_id === user.id
  const isAdmin = user?.role === 1
  const canManage = isCreator || isAdmin

  const handleAdvance = (nextStatus: string) => {
    const statusInfo = STATUS_FLOW.find((s) => s.value === nextStatus)
    const confirmText = statusInfo ? `确认${statusInfo.nextLabel}？此操作可能不可逆。` : `确认推进到 ${nextStatus}？`

    Taro.showModal({
      title: '确认操作',
      content: confirmText,
      confirmColor: '#667eea',
      success: async (res) => {
        if (!res.confirm) return

        // 如果是生成对阵，需要调用 bracket API
        if (nextStatus === 'bracket') {
          try {
            Taro.showLoading({ title: '生成对阵中...' })
            await bracketApi.generate(id, 'auto')
            await tournamentApi.advanceStatus(id, nextStatus)
            Taro.hideLoading()
            Taro.showToast({ title: '对阵已生成', icon: 'success' })
            fetchData()
          } catch (err: any) {
            Taro.hideLoading()
            Taro.showToast({ title: err?.data?.message || '生成失败', icon: 'none' })
          }
          return
        }

        try {
          Taro.showLoading({ title: '处理中...' })
          await tournamentApi.advanceStatus(id, nextStatus)
          Taro.hideLoading()
          Taro.showToast({ title: '操作成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.hideLoading()
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleReview = (regId: string, action: 'approve' | 'reject') => {
    Taro.showModal({
      title: action === 'approve' ? '通过报名' : '拒绝报名',
      content: `确认${action === 'approve' ? '通过' : '拒绝'}此报名？`,
      confirmColor: action === 'approve' ? '#4caf50' : '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await registrationApi.review(id, regId, action)
          Taro.showToast({ title: '操作成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleBatchReview = (action: 'approve' | 'reject') => {
    const pending = registrations.filter((r) => r.status === 'submitted')
    if (pending.length === 0) {
      Taro.showToast({ title: '没有待审核的报名', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '批量操作',
      content: `确认${action === 'approve' ? '通过' : '拒绝'}全部 ${pending.length} 条待审核报名？`,
      confirmColor: action === 'approve' ? '#4caf50' : '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await registrationApi.batchReview(id, pending.map((r) => r.id), action)
          Taro.showToast({ title: '操作成功', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleDelete = () => {
    Taro.showModal({
      title: '删除赛事',
      content: '⚠️ 删除赛事将清除所有相关数据（报名、对阵、比赛记录），此操作不可恢复！',
      confirmText: '确认删除',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await tournamentApi.delete(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => Taro.navigateBack(), 1500)
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  if (loading) {
    return (
      <View className="manage-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!tournament) {
    return (
      <View className="manage-page">
        <View className="empty-state">
          <Text>赛事不存在</Text>
        </View>
      </View>
    )
  }

  if (!canManage) {
    return (
      <View className="manage-page">
        <View className="empty-state">
          <Text>您没有管理权限</Text>
        </View>
      </View>
    )
  }

  const statusInfo = STATUS_FLOW.find((s) => s.value === tournament.status)
  const statusMeta = tournamentStatusMap[tournament.status] || { text: tournament.status, color: '#999' }

  const filteredRegs = activeTab === 'all'
    ? registrations
    : registrations.filter((r) => r.status === activeTab)

  const pendingCount = registrations.filter((r) => r.status === 'submitted').length
  const approvedCount = registrations.filter((r) => r.status === 'approved').length

  return (
    <View className="manage-page">
      {/* 赛事概要 */}
      <View className="tour-header">
        <Text className="tour-title">{tournament.title}</Text>
        <View className="tour-meta">
          <Text className="tag" style={{ background: `${statusMeta.color}20`, color: statusMeta.color }}>
            {statusMeta.text}
          </Text>
          <Text className="meta-text">{formatText(tournament.format)}</Text>
          <Text className="meta-text">{participantTypeMap[tournament.participant_type] || '个人赛'}</Text>
        </View>
      </View>

      {/* 状态推进 */}
      <View className="status-flow-card">
        <Text className="card-title">赛事流程</Text>
        <View className="flow-steps">
          {STATUS_FLOW.map((step, idx) => {
            const isCurrent = tournament.status === step.value
            const isPast = STATUS_FLOW.findIndex((s) => s.value === tournament.status) > idx
            return (
              <View key={step.value} className={`flow-step ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}>
                <View className="step-dot" />
                <Text className="step-label">{step.label}</Text>
              </View>
            )
          })}
        </View>

        {statusInfo?.next && (
          <Button
            className="btn-primary advance-btn"
            onClick={() => handleAdvance(statusInfo.next)}
          >
            {statusInfo.nextLabel}
          </Button>
        )}
      </View>

      {/* 报名管理 */}
      <View className="reg-section">
        <View className="reg-header">
          <Text className="card-title">报名管理</Text>
          <View className="reg-stats">
            <Text className="stat-item">待审 {pendingCount}</Text>
            <Text className="stat-item">已通过 {approvedCount}</Text>
            <Text className="stat-item">总计 {registrations.length}</Text>
          </View>
        </View>

        {pendingCount > 0 && (
          <View className="batch-actions">
            <Button className="batch-btn batch-approve" size="mini" onClick={() => handleBatchReview('approve')}>
              全部通过
            </Button>
            <Button className="batch-btn batch-reject" size="mini" onClick={() => handleBatchReview('reject')}>
              全部拒绝
            </Button>
          </View>
        )}

        {/* 筛选Tab */}
        <ScrollView scrollX className="filter-tabs" showScrollbar={false}>
          {([
            { key: 'all', label: '全部' },
            { key: 'submitted', label: '待审核' },
            { key: 'approved', label: '已通过' },
            { key: 'rejected', label: '已拒绝' },
          ] as const).map((tab) => (
            <View
              key={tab.key}
              className={`filter-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </View>
          ))}
        </ScrollView>

        {/* 报名列表 */}
        {filteredRegs.length === 0 ? (
          <View className="empty-state">
            <Text>暂无报名记录</Text>
          </View>
        ) : (
          <View className="reg-list">
            {filteredRegs.map((reg) => {
              const regStatus = REG_STATUS_MAP[reg.status] || { text: reg.status, color: '#999' }
              return (
                <View key={reg.id} className="reg-card">
                  <View className="reg-info">
                    <View className="reg-user">
                      <Text className="reg-name">{reg.user?.nickname || '未知用户'}</Text>
                      {reg.team && (
                        <Text className="reg-team">[{reg.team.name}]</Text>
                      )}
                    </View>
                    <Text className="reg-time">{formatDate(reg.created_at)}</Text>
                  </View>
                  <View className="reg-bottom">
                    <Text className="tag" style={{ background: `${regStatus.color}15`, color: regStatus.color }}>
                      {regStatus.text}
                    </Text>
                    {reg.status === 'submitted' && (
                      <View className="reg-actions">
                        <Button className="action-btn approve-btn" size="mini" onClick={() => handleReview(reg.id, 'approve')}>
                          通过
                        </Button>
                        <Button className="action-btn reject-btn" size="mini" onClick={() => handleReview(reg.id, 'reject')}>
                          拒绝
                        </Button>
                      </View>
                    )}
                  </View>
                  {reg.custom_fields && Object.keys(reg.custom_fields).length > 0 && (
                    <View className="custom-fields">
                      {Object.entries(reg.custom_fields).map(([key, val]) => (
                        <Text key={key} className="custom-field">
                          {key}: {String(val)}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </View>

      {/* 危险操作 */}
      {tournament.status === 'draft' && (
        <View className="danger-zone">
          <Button className="danger-btn" onClick={handleDelete}>
            删除赛事
          </Button>
        </View>
      )}
    </View>
  )
}
