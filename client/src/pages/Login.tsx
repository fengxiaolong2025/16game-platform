import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Tabs, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { authApi } from '../api';
import { useAuthStore } from '../store';

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleUsernameRegister = async (values: { username: string; password: string; nickname?: string }) => {
    setLoading(true);
    try {
      const res = await authApi.registerByUsername(values.username, values.password, values.nickname);
      login(res.data.token, res.data.user);
      message.success('注册成功，已自动登录');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await authApi.loginByUsername(values.username, values.password);
      login(res.data.token, res.data.user);
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.response?.data?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', margin: 0 }}>⚡ 电竞赛事平台</h1>
          <p style={{ color: '#999', marginTop: 8 }}>让每个人都能办好每一场比赛</p>
        </div>
        <Tabs centered items={[
          {
            key: 'account',
            label: <span><UserOutlined /> 账号登录</span>,
            children: (
              <Form onFinish={handleUsernameLogin} size="large">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input placeholder="请输入用户名" prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password placeholder="请输入密码" prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>登录</Button>
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'register',
            label: <span><UserOutlined /> 注册账号</span>,
            children: (
              <Form onFinish={handleUsernameRegister} size="large">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }, { min: 3, message: '用户名至少3个字符' }, { max: 20, message: '用户名最多20个字符' }]}>
                  <Input placeholder="设置用户名（3-20位）" prefix={<UserOutlined />} />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }]}>
                  <Input.Password placeholder="设置密码（至少6位）" prefix={<LockOutlined />} />
                </Form.Item>
                <Form.Item name="nickname">
                  <Input placeholder="昵称（选填，默认用用户名）" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>注册并登录</Button>
                </Form.Item>
              </Form>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
