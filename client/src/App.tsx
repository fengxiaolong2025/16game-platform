import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store';
import { HomePage } from './pages/Home';
import { LoginPage } from './pages/Login';
import { ProfilePage } from './pages/Profile';
import { CreateTournamentPage } from './pages/CreateTournament';
import { TournamentDetailPage } from './pages/TournamentDetail';
import { TournamentManagePage } from './pages/TournamentManage';
import { TeamPage } from './pages/Team';
import { NotificationsPage } from './pages/Notifications';
import { AppLayout } from './components/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 8 } }}>
      <AntApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="t/:id" element={<TournamentDetailPage />} />
              <Route path="create" element={<ProtectedRoute><CreateTournamentPage /></ProtectedRoute>} />
              <Route path="t/:id/manage" element={<ProtectedRoute><TournamentManagePage /></ProtectedRoute>} />
              <Route path="me" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="teams" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
}
