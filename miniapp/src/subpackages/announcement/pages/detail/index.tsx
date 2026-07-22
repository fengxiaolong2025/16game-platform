import { View, Text, Button } from '@tarojs/components'
import Taro, { useRouter, useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { announcementApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { formatDate } from '../../../../utils'
import './index.scss'

export default function AnnouncementDetail() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [ann, setAnn] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useLoad(() => {
    const id = router.params.id
    if (id) fetchDetail(id)
  })

  const fetchDetail = async (id: string) => {
    try {
      setLoading(true)
      const res = await announcementApi.list({ page: 1, limit: 50 })
      const data = (res.data as any)?.items || (res.data as any) || []
      const found = data.find((a: any) => a.id === id)
      setAnn(found || null)
    } catch (err) {
      console.error('加载失败', err)
    } finally {
      setLoading(false)
    }
  }

  const goToManage = () => {
    if (!user || (user.role ?? 0) < 1) return
    Taro.navigateTo({ url: `/subpackages/admin/pages/announcement/index?id=${ann.id}` })
  }

  if (loading) {
    return (
      <View className="ann-detail-page">
        <View className="loading-text">加载中...</View>
      </View>
    )
  }

  if (!ann) {
    return (
      <View className="ann-detail-page">
        <View className="empty-state">
          <Text>公告不存在或已被删除</Text>
        </View>
      </View>
    )
  }

  return (
    <View className="ann-detail-page">
      <View className="ann-detail-card">
        <View className="ann-detail-header">
          {ann.is_pinned && <Text className="pin-tag">置顶</Text>}
          <Text className="ann-detail-title">{ann.title}</Text>
        </View>
        <View className="ann-detail-meta">
          <Text className="meta-time">{formatDate(ann.created_at)}</Text>
          {ann.status && <Text className="meta-status">{ann.status === 'published' ? '已发布' : ann.status}</Text>}
        </View>
        <View className="ann-detail-content">
          <Text className="content-text">{ann.content}</Text>
        </View>
      </View>

      {(user?.role ?? 0) >= 1 && (
        <Button className="btn-primary edit-btn" onClick={goToManage}>
          编辑此公告
        </Button>
      )}
    </View>
  )
}
