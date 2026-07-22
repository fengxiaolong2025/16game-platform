import { View, Text, Button, Image, Input } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { authApi } from '../../api'
import http from '../../api/request'
import { useAuthStore } from '../../store/auth'
import './index.scss'

type Step = 'login' | 'bind' | 'profile'

interface WechatProfile {
  unionId: string
  nickname: string
  avatar: string
}

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [nickname, setNickname] = useState('')
  const [step, setStep] = useState<Step>('login')
  // 绑定页表单
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  // 微信信息（needBind 时保存）
  const [wechatProfile, setWechatProfile] = useState<WechatProfile | null>(null)

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
      const data = res.data as any

      if (data.needBind) {
        // 未绑定，进入绑定页
        setWechatProfile(data.wechatProfile)
        setStep('bind')
        setLoading(false)
        return
      }

      // 已绑定，直接登录
      const { token: jwt, user } = data
      login(jwt, user)

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

  // 绑定已有账号
  const handleBindAccount = async () => {
    if (!account.trim()) {
      Taro.showToast({ title: '请输入用户名/邮箱/手机号', icon: 'none' })
      return
    }
    if (!password.trim()) {
      Taro.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (!wechatProfile) {
      Taro.showToast({ title: '微信信息丢失，请重新登录', icon: 'none' })
      setStep('login')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.bindWechat(
        account.trim(),
        password.trim(),
        wechatProfile.unionId,
        wechatProfile.nickname,
        wechatProfile.avatar,
      )
      const { token: jwt, user } = res.data as any
      login(jwt, user)

      Taro.showToast({ title: '绑定成功', icon: 'success' })
      // 绑定的老用户一般有头像和昵称，直接进首页
      if (!user.avatar || user.nickname?.startsWith('玩家') || user.nickname?.startsWith('微信用户')) {
        setTimeout(() => setStep('profile'), 500)
      } else {
        setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500)
      }
    } catch (err: any) {
      console.error('绑定失败', err)
      const msg = err?.data?.message || err?.message || '绑定失败，请检查账号密码'
      Taro.showToast({ title: msg, icon: 'none', duration: 3000 })
    } finally {
      setLoading(false)
    }
  }

  // 跳过绑定，直接创建新微信用户
  const handleSkipBind = async () => {
    if (!wechatProfile) {
      setStep('login')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.wechatRegister(
        wechatProfile.unionId,
        wechatProfile.nickname || '微信用户',
        wechatProfile.avatar,
      )
      const { token: jwt, user } = res.data as any
      login(jwt, user)

      // 新用户引导完善信息
      setStep('profile')
    } catch (err: any) {
      console.error('注册失败', err)
      const msg = err?.data?.message || err?.message || '注册失败'
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

  // ========== 绑定账号页 ==========
  if (step === 'bind') {
    return (
      <View className="login-page">
        <View className="bind-card">
          <Text className="bind-title">绑定已有账号</Text>
          <Text className="bind-desc">
            你在网页端注册的账号可以绑定到微信，绑定后两端数据互通
          </Text>

          <View className="form-group">
            <Text className="form-label">用户名 / 邮箱 / 手机号</Text>
            <Input
              className="form-input"
              type="text"
              placeholder="请输入账号"
              value={account}
              onInput={(e) => setAccount(e.detail.value)}
            />
          </View>

          <View className="form-group">
            <Text className="form-label">密码</Text>
            <Input
              className="form-input"
              type="text"
              password
              placeholder="请输入密码"
              value={password}
              onInput={(e) => setPassword(e.detail.value)}
            />
          </View>

          <Button
            className="btn-primary bind-btn"
            loading={loading}
            onClick={handleBindAccount}
          >
            绑定并登录
          </Button>

          <View className="bind-footer">
            <Text className="skip-link" onClick={handleSkipBind}>
              没有账号？跳过绑定，直接创建新账号
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // ========== 完善信息页 ==========
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

  // ========== 登录首页 ==========
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
