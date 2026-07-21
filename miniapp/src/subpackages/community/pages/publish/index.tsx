import { View, Text, Input, Textarea, Button, Image, Picker } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { communityApi, http } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl } from '../../../../utils'
import './index.scss'

const CATEGORIES = [
  { value: 'general', label: '综合' },
  { value: 'tournament', label: '赛事' },
  { value: 'team', label: '战队' },
  { value: 'looking_for_team', label: '找队友' },
  { value: 'off_topic', label: '闲聊' },
]

export default function Publish() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  useLoad(() => {
    if (!token) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  const handleChooseImage = async () => {
    try {
      const res = await Taro.chooseImage({ count: 9 - images.length, sizeType: ['compressed'] })
      const tempPaths = res.tempFilePaths
      Taro.showLoading({ title: '上传中...' })
      const uploadResults = await Promise.all(
        tempPaths.map((fp) => http.upload('/announcements/upload', fp, 'images'))
      )
      Taro.hideLoading()
      const newUrls = uploadResults.flatMap((r: any) => r.data?.urls || [])
      setImages([...images, ...newUrls])
    } catch (err) {
      Taro.hideLoading()
      console.error('上传失败', err)
    }
  }

  const handleRemoveImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (submitting) return
    if (!title.trim()) {
      Taro.showToast({ title: '请输入标题', icon: 'none' })
      return
    }
    if (!content.trim()) {
      Taro.showToast({ title: '请输入内容', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      await communityApi.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        images: images.length > 0 ? images : undefined,
      })
      Taro.showToast({ title: '发布成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1500)
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '发布失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const categoryIndex = CATEGORIES.findIndex((c) => c.value === category)

  return (
    <View className="publish-page">
      <View className="form-card">
        <View className="form-item">
          <Text className="form-label">标题 <Text className="required">*</Text></Text>
          <Input
            className="form-input"
            placeholder="请输入帖子标题"
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
            maxlength={100}
          />
        </View>

        <View className="form-item">
          <Text className="form-label">分类</Text>
          <Picker
            mode="selector"
            range={CATEGORIES}
            rangeKey="label"
            value={categoryIndex >= 0 ? categoryIndex : 0}
            onChange={(e) => setCategory(CATEGORIES[Number(e.detail.value)].value)}
          >
            <View className="picker-value">
              {CATEGORIES[categoryIndex]?.label || '请选择'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">内容 <Text className="required">*</Text></Text>
          <Textarea
            className="form-textarea"
            placeholder="分享你的想法..."
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            maxlength={5000}
            autoHeight
          />
          <View className="char-count">{content.length}/5000</View>
        </View>

        <View className="form-item">
          <Text className="form-label">图片 ({images.length}/9)</Text>
          <View className="image-grid">
            {images.map((img, idx) => (
              <View key={idx} className="image-item">
                <Image className="preview-img" src={toAbsUrl(img)} mode="aspectFill" />
                <View className="remove-btn" onClick={() => handleRemoveImage(idx)}>×</View>
              </View>
            ))}
            {images.length < 9 && (
              <View className="add-image-btn" onClick={handleChooseImage}>
                <Text className="add-icon">+</Text>
                <Text className="add-text">添加图片</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="submit-bar">
        <Button
          className="btn-primary submit-btn"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '发布中...' : '发布帖子'}
        </Button>
      </View>
    </View>
  )
}
