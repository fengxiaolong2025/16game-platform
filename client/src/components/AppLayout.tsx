import { Outlet, useNavigate, Link } from 'react-router-dom';
import { Layout, Menu, Button, Badge, Dropdown, Avatar } from 'antd';
import { TrophyOutlined, PlusOutlined, UserOutlined, BellOutlined, TeamOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useEffect } from 'react';
import { notificationApi } from '../api';

const { Header, Content, Footer } = Layout;

export function AppLayout() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && !user) {
      useAuthStore.getState().fetchUser();
    }
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心', onClick: () => navigate('/me') },
      { key: 'teams', icon: <TeamOutlined />, label: '我的战队', onClick: () => navigate('/teams') },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <TrophyOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>电竞赛事平台</span>
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {token ? (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>创建赛事</Button>
              <Badge count={0} size="small">
                <Button icon={<BellOutlined />} onClick={() => navigate('/notifications')} />
              </Badge>
              <Dropdown menu={userMenu} placement="bottomRight">
                <Avatar style={{ cursor: 'pointer', backgroundColor: '#1677ff' }} icon={<UserOutlined />} src={user?.avatar} />
              </Dropdown>
            </>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>登录</Button>
          )}
        </div>
      </Header>
      <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </Content>
      <Footer style={{ textAlign: 'center', color: '#999' }}>
        电竞赛事平台 © 2026 — 让每个人都能办好每一场比赛
      </Footer>
    </Layout>
  );
}
