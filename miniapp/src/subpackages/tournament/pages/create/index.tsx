import { View, Text, Input, Textarea, Picker, Button, Switch } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { tournamentApi } from '../../../../api'
import { useAuthStore } from '../../../../store/auth'
import './index.scss'

const FORMAT_OPTIONS = [
  { value: 'single_elimination', label: '单淘汰' },
  { value: 'double_elimination', label: '双淘汰' },
  { value: 'round_robin', label: '循环赛' },
]

const PARTICIPANT_TYPE_OPTIONS = [
  { value: 'individual', label: '个人赛' },
  { value: 'team', label: '团队赛' },
]

const GAME_OPTIONS = ['英雄联盟', '王者荣耀', 'DOTA2', 'CS2', 'VALORANT', '和平精英', '原神', '其他']

export default function CreateTournament() {
  const user = useAuthStore((s) => s.user)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '',
    game: GAME_OPTIONS[0],
    format: FORMAT_OPTIONS[0].value,
    participant_type: 'individual',
    team_size: 5,
    max_participants: 16,
    organizer_name: '',
    rules: '',
    is_public: true,
    registration_start_at: '',
    registration_end_at: '',
    start_at: '',
    end_at: '',
  })

  useLoad(() => {
    if (user?.role !== 1) {
      Taro.showToast({ title: '仅管理员可创建赛事', icon: 'none' })
      setTimeout(() => Taro.navigateBack(), 1500)
    }
  })

  const updateForm = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const formatDateForApi = (date: string, time: string): string => {
    if (!date) return ''
    return `${date} ${time || '00:00'}:00`
  }

  const handleSubmit = async () => {
    if (submitting) return

    if (!form.title.trim()) {
      Taro.showToast({ title: '请输入赛事名称', icon: 'none' })
      return
    }
    if (!form.game) {
      Taro.showToast({ title: '请选择游戏', icon: 'none' })
      return
    }
    if (form.max_participants < 2) {
      Taro.showToast({ title: '参赛人数至少2人', icon: 'none' })
      return
    }

    setSubmitting(true)
    try {
      const data: any = {
        title: form.title.trim(),
        game: form.game,
        format: form.format,
        participant_type: form.participant_type,
        max_participants: Number(form.max_participants),
        is_public: form.is_public,
        status: 'draft',
      }

      if (form.participant_type === 'team') {
        data.team_size = Number(form.team_size)
      }
      if (form.organizer_name) {
        data.organizer_name = form.organizer_name.trim()
      }
      if (form.rules) {
        data.rules = form.rules
      }
      if (form.registration_start_at && form.registration_start) {
        data.registration_start_at = formatDateForApi(form.registration_start_at, form.registration_start_time || '')
      }
      if (form.registration_end_at && form.registration_end) {
        data.registration_end_at = formatDateForApi(form.registration_end_at, form.registration_end_time || '')
      }
      if (form.start_at && form.start_time) {
        data.start_at = formatDateForApi(form.start_at, form.start_time)
      }
      if (form.end_at && form.end_time) {
        data.end_at = formatDateForApi(form.end_at, form.end_time)
      }

      const res = await tournamentApi.create(data)
      Taro.showToast({ title: '创建成功', icon: 'success' })

      setTimeout(() => {
        // 跳转到赛事管理页
        const tourId = (res.data as any)?.id
        if (tourId) {
          Taro.redirectTo({ url: `/subpackages/tournament/pages/manage/index?id=${tourId}` })
        } else {
          Taro.navigateBack()
        }
      }, 1500)
    } catch (err: any) {
      const msg = err?.data?.message || '创建失败'
      Taro.showToast({ title: msg, icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const formatIndex = FORMAT_OPTIONS.findIndex((f) => f.value === form.format)
  const participantIndex = PARTICIPANT_TYPE_OPTIONS.findIndex((p) => p.value === form.participant_type)
  const gameIndex = GAME_OPTIONS.indexOf(form.game)

  return (
    <View className="create-page">
      {/* 基本信息 */}
      <View className="form-card">
        <Text className="card-title">基本信息</Text>

        <View className="form-item">
          <Text className="form-label">赛事名称 <Text className="required">*</Text></Text>
          <Input
            className="form-input"
            placeholder="请输入赛事名称"
            value={form.title}
            onInput={(e) => updateForm('title', e.detail.value)}
            maxlength={100}
          />
        </View>

        <View className="form-item">
          <Text className="form-label">游戏项目 <Text className="required">*</Text></Text>
          <Picker
            mode="selector"
            range={GAME_OPTIONS}
            value={gameIndex >= 0 ? gameIndex : 0}
            onChange={(e) => updateForm('game', GAME_OPTIONS[Number(e.detail.value)])}
          >
            <View className="picker-value">
              {form.game}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">赛制 <Text className="required">*</Text></Text>
          <Picker
            mode="selector"
            range={FORMAT_OPTIONS}
            rangeKey="label"
            value={formatIndex >= 0 ? formatIndex : 0}
            onChange={(e) => updateForm('format', FORMAT_OPTIONS[Number(e.detail.value)].value)}
          >
            <View className="picker-value">
              {FORMAT_OPTIONS[formatIndex]?.label || '请选择'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">参赛类型</Text>
          <Picker
            mode="selector"
            range={PARTICIPANT_TYPE_OPTIONS}
            rangeKey="label"
            value={participantIndex >= 0 ? participantIndex : 0}
            onChange={(e) => updateForm('participant_type', PARTICIPANT_TYPE_OPTIONS[Number(e.detail.value)].value)}
          >
            <View className="picker-value">
              {PARTICIPANT_TYPE_OPTIONS[participantIndex]?.label || '请选择'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        {form.participant_type === 'team' && (
          <View className="form-item">
            <Text className="form-label">队伍人数</Text>
            <Input
              className="form-input"
              type="number"
              placeholder="如5"
              value={String(form.team_size)}
              onInput={(e) => updateForm('team_size', e.detail.value)}
            />
          </View>
        )}

        <View className="form-item">
          <Text className="form-label">最大参赛数 <Text className="required">*</Text></Text>
          <Input
            className="form-input"
            type="number"
            placeholder="如16"
            value={String(form.max_participants)}
            onInput={(e) => updateForm('max_participants', e.detail.value)}
          />
        </View>

        <View className="form-item">
          <Text className="form-label">主办方名称</Text>
          <Input
            className="form-input"
            placeholder="选填"
            value={form.organizer_name}
            onInput={(e) => updateForm('organizer_name', e.detail.value)}
          />
        </View>
      </View>

      {/* 时间设置 */}
      <View className="form-card">
        <Text className="card-title">时间设置</Text>

        <View className="form-item">
          <Text className="form-label">报名开始时间</Text>
          <Picker mode="date" value={form.registration_start_at} onChange={(e) => updateForm('registration_start_at', e.detail.value)}>
            <View className="picker-value">
              {form.registration_start_at || '选择日期'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">报名截止时间</Text>
          <Picker mode="date" value={form.registration_end_at} onChange={(e) => updateForm('registration_end_at', e.detail.value)}>
            <View className="picker-value">
              {form.registration_end_at || '选择日期'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">比赛开始时间</Text>
          <Picker mode="date" value={form.start_at} onChange={(e) => updateForm('start_at', e.detail.value)}>
            <View className="picker-value">
              {form.start_at || '选择日期'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-label">比赛结束时间</Text>
          <Picker mode="date" value={form.end_at} onChange={(e) => updateForm('end_at', e.detail.value)}>
            <View className="picker-value">
              {form.end_at || '选择日期'}
              <Text className="picker-arrow">›</Text>
            </View>
          </Picker>
        </View>
      </View>

      {/* 规则 */}
      <View className="form-card">
        <Text className="card-title">赛事规则</Text>
        <Textarea
          className="form-textarea"
          placeholder="请输入赛事规则、赛制说明等（选填）"
          value={form.rules}
          onInput={(e) => updateForm('rules', e.detail.value)}
          maxlength={2000}
          autoHeight
        />
        <View className="char-count">{form.rules.length}/2000</View>
      </View>

      {/* 公开设置 */}
      <View className="form-card">
        <View className="form-item form-item-row">
          <Text className="form-label">公开赛事</Text>
          <Switch
            checked={form.is_public}
            color="#667eea"
            onChange={(e) => updateForm('is_public', e.detail.value)}
          />
        </View>
      </View>

      {/* 提交按钮 */}
      <View className="submit-bar">
        <Button
          className="btn-primary submit-btn"
          loading={submitting}
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? '创建中...' : '创建赛事'}
        </Button>
      </View>
    </View>
  )
}
