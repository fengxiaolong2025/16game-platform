import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Layout, Button, Badge, Dropdown, Avatar } from 'antd';
import { TrophyOutlined, PlusOutlined, UserOutlined, BellOutlined, TeamOutlined, LogoutOutlined, SettingOutlined, CrownOutlined, HomeOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import { useEffect } from 'react';

const { Header, Content, Footer } = Layout;

export function AppLayout() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

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
      ...(user && (user as any).role >= 1 ? [{ key: 'admin', icon: <SettingOutlined />, label: '管理后台', onClick: () => navigate('/admin') }] : []),
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
    ],
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <TrophyOutlined style={{ fontSize: 24, color: '#1677ff' }} />
            <span className="logo-text" style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>电竞赛事平台</span>
          </Link>
          <nav style={{ display: 'flex', gap: 16 }}>
            <Link to="/teams-showcase" style={{ textDecoration: 'none', color: '#333' }}><TeamOutlined /> 战队展示</Link>
            <Link to="/players-showcase" style={{ textDecoration: 'none', color: '#333' }}><UserOutlined /> 选手展示</Link>
            <Link to="/honor-roll" style={{ textDecoration: 'none', color: '#333' }}><CrownOutlined /> 光荣榜</Link>
          </nav>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {token ? (
            <>
              <Button className="create-btn" type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>创建赛事</Button>
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

      <Content className="app-content" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto', width: '100%', paddingBottom: 70 }}>
        <Outlet />
      </Content>

      {/* Mobile Bottom Navigation */}
      <div className="mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #f0f0f0',
        display: 'none', justifyContent: 'space-around', alignItems: 'center',
        height: 56, zIndex: 100, padding: '0 8px',
      }}>
        <Link to="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', color: isActive('/') ? '#1677ff' : '#666', fontSize: 11 }}>
          <HomeOutlined style={{ fontSize: 20 }} />
          <span>首页</span>
        </Link>
        <Link to="/teams-showcase" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', color: isActive('/teams-showcase') ? '#1677ff' : '#666', fontSize: 11 }}>
          <TeamOutlined style={{ fontSize: 20 }} />
          <span>战队</span>
        </Link>
        <Link to="/players-showcase" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', color: isActive('/players-showcase') ? '#1677ff' : '#666', fontSize: 11 }}>
          <UserOutlined style={{ fontSize: 20 }} />
          <span>选手</span>
        </Link>
        <Link to="/honor-roll" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textDecoration: 'none', color: isActive('/honor-roll') ? '#1677ff' : '#666', fontSize: 11 }}>
          <CrownOutlined style={{ fontSize: 20 }} />
          <span>光荣榜</span>
        </Link>
        <div onClick={() => token ? navigate('/me') : navigate('/login')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', color: isActive('/me') ? '#1677ff' : '#666', fontSize: 11 }}>
          <UserOutlined style={{ fontSize: 20 }} />
          <span>{token ? '我的' : '登录'}</span>
        </div>
      </div>

      <Footer className="app-footer" style={{ textAlign: 'center', color: '#999' }}>
        电竞赛事平台 © 2026 — 让每个人都能办好每一场比赛
      </Footer>
    </Layout>
  );
}
