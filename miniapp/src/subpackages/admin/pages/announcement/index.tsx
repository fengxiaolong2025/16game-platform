import { View, Text, Input, Textarea, Button, Switch, ScrollView } from '@tarojs/components'
import Taro, { useLoad, usePullDownRefresh } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { announcementApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { formatDate } from '../../../../utils'
import './index.scss'

export default function AnnouncementManage() {
  const user = useAuthStore((s) => s.user)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    is_pinned: false,
    status: 'published',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await announcementApi.adminList({ page: 1, limit: 50 })
      const data = (res.data as any)?.items || (res.data as any) || []
      setAnnouncements(data)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useLoad(() => {
    if (!user || (user.role ?? 0) < 1) {
      Taro.showToast({ title: '仅管理员可访问', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
      return
    }
    fetchData()
  })

  usePullDownRefresh(() => {
    fetchData().then(() => Taro.stopPullDownRefresh())
  })

  const resetForm = () => {
    setForm({ title: '', content: '', is_pinned: false, status: 'published' })
    setEditingId(null)
  }

  const handleEdit = (ann: any) => {
    setForm({
      title: ann.title || '',
      content: ann.content || '',
      is_pinned: ann.is_pinned || false,
      status: ann.status || 'published',
    })
    setEditingId(ann.id)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Taro.showToast({ title: '请填写标题和内容', icon: 'none' })
      return
    }
    try {
      if (editingId) {
        await announcementApi.update(editingId, form)
      } else {
        await announcementApi.create(form)
      }
      Taro.showToast({ title: '操作成功', icon: 'success' })
      resetForm()
      setShowForm(false)
      fetchData()
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '操作失败', icon: 'none' })
    }
  }

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除公告',
      content: '确认删除此公告？',
      confirmColor: '#f44336',
      success: async (res) => {
        if (!res.confirm) return
        try {
          await announcementApi.delete(id)
          Taro.showToast({ title: '已删除', icon: 'success' })
          fetchData()
        } catch (err: any) {
          Taro.showToast({ title: err?.data?.message || '删除失败', icon: 'none' })
        }
      },
    })
  }

  return (
    <View className="ann-manage-page">
      {/* 顶部操作 */}
      {!showForm && (
        <View className="top-bar">
          <Text className="title">公告列表 ({announcements.length})</Text>
          <Button
            className="btn-primary create-btn"
            size="mini"
            onClick={() => { resetForm(); setShowForm(true) }}
          >
            + 新建公告
          </Button>
        </View>
      )}

      {/* 表单 */}
      {showForm && (
        <View className="form-card">
          <Text className="card-title">{editingId ? '编辑公告' : '新建公告'}</Text>

          <View className="form-item">
            <Text className="form-label">标题 <Text className="required">*</Text></Text>
            <Input
              className="form-input"
              placeholder="请输入公告标题"
              value={form.title}
              onInput={(e) => setForm({ ...form, title: e.detail.value })}
              maxlength={200}
            />
          </View>

          <View className="form-item">
            <Text className="form-label">内容 <Text className="required">*</Text></Text>
            <Textarea
              className="form-textarea"
              placeholder="请输入公告内容"
              value={form.content}
              onInput={(e) => setForm({ ...form, content: e.detail.value })}
              maxlength={5000}
              autoHeight
            />
          </View>

          <View className="form-item form-item-row">
            <Text className="form-label">置顶</Text>
            <Switch
              checked={form.is_pinned}
              color="#667eea"
              onChange={(e) => setForm({ ...form, is_pinned: e.detail.value })}
            />
          </View>

          <View className="form-actions">
            <Button className="cancel-btn" onClick={() => { resetForm(); setShowForm(false) }}>
              取消
            </Button>
            <Button className="btn-primary submit-btn" onClick={handleSubmit}>
              {editingId ? '保存' : '发布'}
            </Button>
          </View>
        </View>
      )}

      {/* 列表 */}
      {!showForm && (
        <View className="ann-list">
          {announcements.length === 0 && !loading && (
            <View className="empty-state">
              <Text>暂无公告</Text>
            </View>
          )}

          {announcements.map((ann) => (
            <View key={ann.id} className="ann-card">
              <View className="ann-header">
                <View className="ann-title-row">
                  {ann.is_pinned && <Text className="pin-tag">置顶</Text>}
                  <Text className="ann-title">{ann.title}</Text>
                </View>
                <Text className="ann-time">{formatDate(ann.created_at)}</Text>
              </View>
              <Text className="ann-content" numberOfLines={3}>
                {ann.content}
              </Text>
              <View className="ann-actions">
                <Button className="action-btn edit-btn" size="mini" onClick={() => handleEdit(ann)}>
                  编辑
                </Button>
                <Button className="action-btn delete-btn" size="mini" onClick={() => handleDelete(ann.id)}>
                  删除
                </Button>
              </View>
            </View>
          ))}

          {loading && <View className="loading-text">加载中...</View>}
        </View>
      )}
    </View>
  )
}
