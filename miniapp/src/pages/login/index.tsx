import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { authApi } from '../../api'
import http from '../../api/request'
import { useAuthStore } from '../../store/auth'
import './index.scss'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [nickname, setNickname] = useState('')
  const [step, setStep] = useState<'login' | 'profile'>('login')
  const login = useAuthStore((s) => s.login)
  const setUser = useAuthStore((s) => s.setUser)
  const token = useAuthStore((s) => s.token)

  useLoad(() => {
    if (token) {
      Taro.switchTab({ url: '/pages/home/index' })
    }
  })

  // 微信一键登录
  const handleWechatLogin = async () => {
    setLoading(true)
    try {
      const { code } = await Taro.login()
      const res = await authApi.loginByWechat(code)
      const { token: jwt, user } = res.data as any
      login(jwt, user)

      // 如果用户没有头像或昵称为默认值，引导填写
      if (!user.avatar || user.nickname?.startsWith('微信用户')) {
        setStep('profile')
      } else {
        Taro.showToast({ title: '登录成功', icon: 'success' })
        setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500)
      }
    } catch (err: any) {
      console.error('登录失败', err)
      const msg = err?.errMsg || err?.message || '登录失败，请检查网络'
      Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  // 头像选择
  const handleChooseAvatar = (e) => {
    setAvatarUrl(e.detail.avatarUrl)
  }

  // 保存头像昵称
  const handleSaveProfile = async () => {
    if (!nickname.trim()) {
      Taro.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    setLoading(true)
    try {
      // 如果有头像临时文件，上传到服务器
      let avatarPath = avatarUrl
      if (avatarUrl && (avatarUrl.startsWith('http://tmp') || avatarUrl.startsWith('wxfile://'))) {
        try {
          const uploadRes = await http.upload<{ urls: string[] }>('/users/me/photos', avatarUrl, 'images')
          avatarPath = uploadRes.data.urls?.[0] || avatarUrl
        } catch (err) {
          console.error('头像上传失败', err)
        }
      }
      const res = await authApi.updateProfile({ nickname: nickname.trim(), avatar: avatarPath })
      setUser(res.data as any)
      Taro.showToast({ title: '设置成功', icon: 'success' })
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500)
    } catch (err) {
      console.error('保存失败', err)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'profile') {
    return (
      <View className="login-page">
        <View className="profile-setup">
          <Text className="setup-title">完善个人信息</Text>
          <Text className="setup-desc">设置你的头像和昵称</Text>
          <Button
            className="avatar-btn"
            openType="chooseAvatar"
            onChooseAvatar={handleChooseAvatar}
          >
            {avatarUrl ? (
              <Image className="avatar-img" src={avatarUrl} />
            ) : (
              <View className="avatar-placeholder">点击选择头像</View>
            )}
          </Button>
          <Input
            className="nickname-input"
            type="nickname"
            placeholder="请输入昵称"
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
          />
          <Button
            className="btn-primary save-btn"
            loading={loading}
            onClick={handleSaveProfile}
          >
            保存并进入
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className="login-page">
      <View className="login-header">
        <View className="logo-circle">
          <Text className="logo-text">ESPORTS</Text>
        </View>
        <Text className="app-name">电竞赛事平台</Text>
        <Text className="app-desc">一站式智能办赛系统</Text>
      </View>

      <View className="login-body">
        <Button
          className="btn-primary wechat-login-btn"
          loading={loading}
          onClick={handleWechatLogin}
        >
          微信一键登录
        </Button>
        <Text className="login-tip">
          登录即表示同意《用户协议》和《隐私政策》
        </Text>
      </View>
    </View>
  )
}
