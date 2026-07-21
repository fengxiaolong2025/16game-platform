import { View, Text, Input, Textarea, Button, Image, ScrollView } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { teamApi, http } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl, formatDate } from '../../../../utils'
import './index.scss'

type TabKey = 'create' | 'manage'

export default function TeamManage() {
  const router = useRouter()
  const initialId = router.params.id
  const user = useAuthStore((s) => s.user)

  const [activeTab, setActiveTab] = useState<TabKey>(initialId ? 'manage' : 'create')
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialId || '')
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 创建表单
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    description: '',
    logo: '',
  })
  const [creating, setCreating] = useState(false)

  // 编辑表单
  const [editForm, setEditForm] = useState({
    name: '',
    tag: '',
    description: '',
    achievement: '',
  })
  const [editing, setEditing] = useState(false)

  const fetchMyTeams = useCallback(async () => {
    try {
      const res = await teamApi.myCaptainTeams()
      const data = (res.data as any)?.items || (res.data as any) || []
      setMyTeams(data)
      if (data.length > 0 && !selectedTeamId) {
        setSelectedTeamId(data[0].id)
        loadTeamDetail(data[0].id)
      } else if (selectedTeamId) {
        loadTeamDetail(selectedTeamId)
      }
    } catch (err) {
      console.error('加载战队失败', err)
    }
  }, [selectedTeamId])

  const loadTeamDetail = async (teamId: string) => {
    setLoading(true)
    try {
      const [teamRes, memberRes] = await Promise.all([
        teamApi.get(teamId),
        teamApi.members(teamId),
      ])
      const teamData = teamRes.data as any
      setTeam(teamData)
      setEditForm({
        name: teamData.name || '',
        tag: teamData.tag || '',
        description: teamData.description || '',
        achievement: teamData.achievement || '',
      })
      const memberData = (memberRes.data as any)?.items || (memberRes.data as any) || []
      setMembers(memberData)
    } catch (err) {
      console.error('加载详情失败', err)
    } finally {
      setLoading(false)
    }
  }

  useLoad(() => {
    fetchMyTeams()
  })

  const handleCreate = async () => {
    if (creating) return
    if (!createForm.name.trim()) {
      Taro.showToast({ title: '请输入战队名称', icon: 'none' })
      return
    }
    setCreating(true)
    try {
      const data: any = { name: createForm.name.trim() }
      if (createForm.tag) data.tag = createForm.tag.trim()
      if (createForm.description) data.description = createForm.description
      if (createForm.logo) data.logo = createForm.logo

      await teamApi.create(data)
      Taro.showToast({ title: '创建成功', icon: 'success' })
      setCreateForm({ name: '', tag: '', description: '', logo: '' })
      await fetchMyTeams()
      setActiveTab('manage')
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '创建失败', icon: 'none' })
    } finally {
      setCreating(false)
    }
  }

  const handleUploadLogo = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const tempPath = res.tempFilePaths[0]
      Taro.showLoading({ title: '上传中...' })
      const uploadRes = await http.upload('/teams/upload', tempPath, 'images')
      Taro.hideLoading()
      const urls = (uploadRes.data as any)?.urls || []
      if (urls.length > 0) {
        setCreateForm({ ...createForm, logo: urls[0] })
      }
    } catch (err) {
      Taro.hideLoading()
      console.error('上传失败', err)
    }
  }

  const handleReviewMember = async (memberId: string, action: 'approve' | 'reject') => {
    try {
      await teamApi.reviewMember(selectedTeamId, memberId, action)
      Taro.showToast({ title: '操作成功', icon: 'success' })
      loadTeamDetail(selectedTeamId)
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
    }
  }

  const handleRemoveMember = (memberId: string, name: string) => {
    Taro.showModal({
      title: '移除成员',
      content: `确认移除 ${name}？`,
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await teamApi.removeMember(selectedTeamId, memberId)
          Taro.showToast({ title: '已移除', icon: 'success' })
          loadTeamDetail(selectedTeamId)
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleSaveEdit = async () => {
    if (editing) return
    setEditing(true)
    try {
      await teamApi.update(selectedTeamId, {
        name: editForm.name.trim(),
        tag: editForm.tag.trim(),
        description: editForm.description,
        achievement: editForm.achievement,
      })
      Taro.showToast({ title: '保存成功', icon: 'success' })
      loadTeamDetail(selectedTeamId)
      fetchMyTeams()
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '保存失败', icon: 'none' })
    } finally {
      setEditing(false)
    }
  }

  const handleDisband = () => {
    Taro.showModal({
      title: '解散战队',
      content: '⚠️ 解散战队将清除所有成员关系，此操作不可恢复！',
      confirmText: '确认解散',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await teamApi.disbandTeam(selectedTeamId)
          Taro.showToast({ title: '已解散', icon: 'success' })
          setSelectedTeamId('')
          setTeam(null)
          fetchMyTeams()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
        }
      },
    })
  }

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    loadTeamDetail(teamId)
  }

  const pendingMembers = members.filter((m) => m.status === 'pending')
  const approvedMembers = members.filter((m) => m.status === 'approved')

  return (
    <View className="team-manage-page">
      {/* Tab切换 */}
      <View className="top-tabs">
        <View
          className={`top-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          创建战队
        </View>
        <View
          className={`top-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          管理战队 ({myTeams.length})
        </View>
      </View>

      {/* 创建战队 */}
      {activeTab === 'create' && (
        <View className="create-section">
          <View className="form-card">
            {/* Logo */}
            <View className="logo-upload" onClick={handleUploadLogo}>
              {createForm.logo ? (
                <Image className="logo-preview" src={toAbsUrl(createForm.logo)} mode="aspectFill" />
              ) : (
                <View className="logo-placeholder">
                  <Text className="upload-icon">📷</Text>
                  <Text className="upload-text">上传Logo</Text>
                </View>
              )}
            </View>

            <View className="form-item">
              <Text className="form-label">战队名称 <Text className="required">*</Text></Text>
              <Input
                className="form-input"
                placeholder="请输入战队名称"
                value={createForm.name}
                onInput={(e) => setCreateForm({ ...createForm, name: e.detail.value })}
                maxlength={50}
              />
            </View>

            <View className="form-item">
              <Text className="form-label">战队标签</Text>
              <Input
                className="form-input"
                placeholder="如 [WIN]"
                value={createForm.tag}
                onInput={(e) => setCreateForm({ ...createForm, tag: e.detail.value })}
                maxlength={20}
              />
            </View>

            <View className="form-item">
              <Text className="form-label">战队简介</Text>
              <Textarea
                className="form-textarea"
                placeholder="介绍一下你的战队..."
                value={createForm.description}
                onInput={(e) => setCreateForm({ ...createForm, description: e.detail.value })}
                maxlength={500}
                autoHeight
              />
            </View>
          </View>

          <Button
            className="btn-primary submit-btn"
            loading={creating}
            disabled={creating}
            onClick={handleCreate}
          >
            {creating ? '创建中...' : '创建战队'}
          </Button>
        </View>
      )}

      {/* 管理战队 */}
      {activeTab === 'manage' && (
        <View className="manage-section">
          {myTeams.length === 0 ? (
            <View className="empty-state">
              <Text>您还不是任何战队的队长</Text>
              <Text className="link-text" onClick={() => setActiveTab('create')}>
                去创建战队 ›
              </Text>
            </View>
          ) : (
            <>
              {/* 战队选择器 */}
              <ScrollView scrollX className="team-selector" showScrollbar={false}>
                {myTeams.map((t) => (
                  <View
                    key={t.id}
                    className={`team-chip ${selectedTeamId === t.id ? 'active' : ''}`}
                    onClick={() => handleTeamSelect(t.id)}
                  >
                    {t.name}
                  </View>
                ))}
              </ScrollView>

              {loading ? (
                <View className="loading-text">加载中...</View>
              ) : team ? (
                <>
                  {/* 编辑信息 */}
                  <View className="form-card">
                    <Text className="card-title">战队信息</Text>
                    <View className="form-item">
                      <Text className="form-label">战队名称</Text>
                      <Input
                        className="form-input"
                        value={editForm.name}
                        onInput={(e) => setEditForm({ ...editForm, name: e.detail.value })}
                      />
                    </View>
                    <View className="form-item">
                      <Text className="form-label">战队标签</Text>
                      <Input
                        className="form-input"
                        value={editForm.tag}
                        onInput={(e) => setEditForm({ ...editForm, tag: e.detail.value })}
                      />
                    </View>
                    <View className="form-item">
                      <Text className="form-label">简介</Text>
                      <Textarea
                        className="form-textarea"
                        value={editForm.description}
                        onInput={(e) => setEditForm({ ...editForm, description: e.detail.value })}
                        autoHeight
                      />
                    </View>
                    <View className="form-item">
                      <Text className="form-label">成就</Text>
                      <Textarea
                        className="form-textarea"
                        placeholder="战队获得的荣誉..."
                        value={editForm.achievement}
                        onInput={(e) => setEditForm({ ...editForm, achievement: e.detail.value })}
                        autoHeight
                      />
                    </View>
                    <Button
                      className="btn-primary save-btn"
                      loading={editing}
                      disabled={editing}
                      onClick={handleSaveEdit}
                    >
                      保存修改
                    </Button>
                  </View>

                  {/* 待审核成员 */}
                  {pendingMembers.length > 0 && (
                    <View className="form-card">
                      <Text className="card-title">待审核申请 ({pendingMembers.length})</Text>
                      {pendingMembers.map((m) => (
                        <View key={m.id} className="member-row pending">
                          <Image
                            className="member-avatar"
                            src={toAbsUrl(m.user?.avatar) || 'https://via.placeholder.com/64'}
                            mode="aspectFill"
                          />
                          <Text className="member-name">{m.user?.nickname || '未知'}</Text>
                          <View className="member-actions">
                            <Button className="mini-btn approve" size="mini" onClick={() => handleReviewMember(m.id, 'approve')}>
                              通过
                            </Button>
                            <Button className="mini-btn reject" size="mini" onClick={() => handleReviewMember(m.id, 'reject')}>
                              拒绝
                            </Button>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 正式成员 */}
                  <View className="form-card">
                    <Text className="card-title">正式成员 ({approvedMembers.length})</Text>
                    {approvedMembers.map((m) => (
                      <View key={m.id} className="member-row">
                        <Image
                          className="member-avatar"
                          src={toAbsUrl(m.user?.avatar) || 'https://via.placeholder.com/64'}
                          mode="aspectFill"
                        />
                        <View className="member-info">
                          <Text className="member-name">{m.user?.nickname || '未知'}</Text>
                          <Text className="member-time">{formatDate(m.joined_at)}</Text>
                        </View>
                        {m.role !== 'captain' && (
                          <Button
                            className="mini-btn remove"
                            size="mini"
                            onClick={() => handleRemoveMember(m.id, m.user?.nickname || '该成员')}
                          >
                            移除
                          </Button>
                        )}
                        {m.role === 'captain' && <Text className="captain-tag">队长</Text>}
                      </View>
                    ))}
                  </View>

                  {/* 解散 */}
                  <View className="danger-zone">
                    <Button className="danger-btn" onClick={handleDisband}>
                      解散战队
                    </Button>
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      )}
    </View>
  )
}
