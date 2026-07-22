import { View, Text, Input, Textarea, Button, Image } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { authApi, http } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import { toAbsUrl } from '../../../../utils'
import './index.scss'

// 与网页端 Profile.tsx 完全一致的位置选项
const POSITION_OPTIONS = ['上单', '打野', '中单', 'ADC', '辅助', '指挥', '狙击手', '突破手', '自由人', '教练', '队长']

const GAME_OPTIONS = ['英雄联盟', '王者荣耀', 'CS2', 'Valorant', 'DOTA2', 'DOTA1', '无畏契约', '和平精英']

export default function ProfileEdit() {
  const user = useAuthStore((s) => s.user)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  const [form, setForm] = useState({
    nickname: '',
    avatar: '',
    bio: '',
    game_ids: '',
    position: '',
    phone: '',
    email: '',
    games: [] as string[],
    ladder_score: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useLoad(() => {
    if (user) {
      setForm({
        nickname: user.nickname || '',
        avatar: user.avatar || '',
        bio: user.bio || '',
        game_ids: user.game_ids || '',
        position: user.position || '',
        phone: user.phone || '',
        email: user.email || '',
        games: user.games || [],
        ladder_score: user.ladder_score != null ? String(user.ladder_score) : '',
      })
      setPhotos(user.player_photos || [])
    }
    setLoaded(true)
  })

  const handleUploadAvatar = async () => {
    try {
      const res = await Taro.chooseImage({ count: 1, sizeType: ['compressed'] })
      const tempPath = res.tempFilePaths[0]
      Taro.showLoading({ title: '上传中...' })
      const uploadRes = await http.upload('/users/me/photos', tempPath, 'images')
      Taro.hideLoading()
      const urls = (uploadRes.data as any)?.urls || []
      if (urls.length > 0) {
        setForm({ ...form, avatar: urls[0] })
      }
    } catch (err) {
      Taro.hideLoading()
      console.error('上传失败', err)
    }
  }

  const handleUploadPhoto = async () => {
    if (photos.length >= 6) {
      Taro.showToast({ title: '最多上传6张照片', icon: 'none' })
      return
    }
    try {
      const res = await Taro.chooseImage({ count: 6 - photos.length, sizeType: ['compressed'] })
      Taro.showLoading({ title: '上传中...' })
      const uploadPromises = res.tempFilePaths.map((fp) => http.upload('/users/me/photos', fp, 'images'))
      const results = await Promise.all(uploadPromises)
      Taro.hideLoading()
      const newUrls = results.flatMap((r) => (r.data as any)?.urls || [])
      setPhotos([...photos, ...newUrls])
    } catch (err) {
      Taro.hideLoading()
      console.error('上传失败', err)
    }
  }

  const toggleGame = (game: string) => {
    const has = form.games.includes(game)
    setForm({
      ...form,
      games: has ? form.games.filter((g) => g !== game) : [...form.games, game],
    })
  }

  const handleSave = async () => {
    if (saving) return
    if (!form.nickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    setSaving(true)
    try {
      const ladderScore = form.ladder_score === '' || form.ladder_score === undefined
        ? null
        : Number(form.ladder_score)
      await authApi.updateProfile({
        nickname: form.nickname.trim(),
        avatar: form.avatar,
        bio: form.bio,
        game_ids: form.game_ids,
        position: form.position,
        phone: form.phone,
        email: form.email,
        games: form.games,
        ladder_score: ladderScore,
        player_photos: photos,
      })
      await fetchUser()
      Taro.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => Taro.navigateBack(), 1000)
    } catch (err: any) {
      Taro.showToast({ title: err?.data?.message || '保存失败', icon: 'none' })
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) return null

  return (
    <View className="profile-edit-page">
      {/* 头像 */}
      <View className="form-card">
        <View className="avatar-section" onClick={handleUploadAvatar}>
          <Image
            className="avatar-preview"
            src={toAbsUrl(form.avatar) || 'https://via.placeholder.com/120'}
            mode="aspectFill"
          />
          <Text className="avatar-tip">点击更换头像</Text>
        </View>

        {/* 昵称 */}
        <View className="form-item">
          <Text className="form-label">昵称 <Text className="required">*</Text></Text>
          <Input
            className="form-input"
            placeholder="请输入昵称"
            value={form.nickname}
            onInput={(e) => setForm({ ...form, nickname: e.detail.value })}
            maxlength={50}
          />
        </View>

        {/* 个人简介 */}
        <View className="form-item">
          <Text className="form-label">个人简介</Text>
          <Textarea
            className="form-textarea"
            placeholder="介绍一下自己..."
            value={form.bio}
            onInput={(e) => setForm({ ...form, bio: e.detail.value })}
            maxlength={500}
            autoHeight
          />
        </View>
      </View>

      {/* 游戏信息 */}
      <View className="form-card">
        <Text className="card-title">游戏信息</Text>

        <View className="form-item">
          <Text className="form-label">游戏ID</Text>
          <Input
            className="form-input"
            placeholder="你的游戏内ID"
            value={form.game_ids}
            onInput={(e) => setForm({ ...form, game_ids: e.detail.value })}
            maxlength={100}
          />
        </View>

        <View className="form-item">
          <Text className="form-label">常玩位置</Text>
          <View className="chip-list">
            {POSITION_OPTIONS.map((pos) => (
              <View
                key={pos}
                className={`chip ${form.position === pos ? 'active' : ''}`}
                onClick={() => setForm({ ...form, position: form.position === pos ? '' : pos })}
              >
                {pos}
              </View>
            ))}
          </View>
        </View>

        <View className="form-item">
          <Text className="form-label">擅长游戏</Text>
          <View className="chip-list">
            {GAME_OPTIONS.map((g) => (
              <View
                key={g}
                className={`chip ${form.games.includes(g) ? 'active' : ''}`}
                onClick={() => toggleGame(g)}
              >
                {g}
              </View>
            ))}
          </View>
        </View>

        <View className="form-item">
          <Text className="form-label">16天梯分数</Text>
          <Input
            className="form-input"
            placeholder="输入你的16天梯分数"
            value={form.ladder_score}
            onInput={(e) => setForm({ ...form, ladder_score: e.detail.value })}
            maxlength={10}
            type="number"
          />
        </View>
      </View>

      {/* 个人照片 */}
      <View className="form-card">
        <Text className="card-title">个人照片（最多6张）</Text>
        <View className="photo-grid">
          {photos.map((photo, idx) => (
            <View key={idx} className="photo-item-wrap">
              <Image
                className="photo-item"
                src={toAbsUrl(photo)}
                mode="aspectFill"
              />
              <Text
                className="photo-remove"
                onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
              >✕</Text>
            </View>
          ))}
          {photos.length < 6 && (
            <View className="photo-add" onClick={handleUploadPhoto}>
              <Text className="photo-add-icon">+</Text>
            </View>
          )}
        </View>
      </View>

      {/* 联系方式 */}
      <View className="form-card">
        <Text className="card-title">联系方式</Text>

        <View className="form-item">
          <Text className="form-label">手机号</Text>
          <Input
            className="form-input"
            placeholder="请输入手机号"
            value={form.phone}
            onInput={(e) => setForm({ ...form, phone: e.detail.value })}
            maxlength={11}
            type="number"
          />
        </View>

        <View className="form-item">
          <Text className="form-label">邮箱</Text>
          <Input
            className="form-input"
            placeholder="请输入邮箱"
            value={form.email}
            onInput={(e) => setForm({ ...form, email: e.detail.value })}
            maxlength={100}
          />
        </View>
      </View>

      <Button
        className="btn-primary save-btn"
        loading={saving}
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? '保存中...' : '保存'}
      </Button>
    </View>
  )
}
