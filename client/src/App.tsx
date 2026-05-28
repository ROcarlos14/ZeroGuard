import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MFAPage from './pages/MFAPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DevicesPage from './pages/DevicesPage';
import ResourcesPage from './pages/ResourcesPage';
import PoliciesPage from './pages/PoliciesPage';
import LogsPage from './pages/LogsPage';
import ThreatsPage from './pages/ThreatsPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user, requiresMFA } = useAuthStore();
  if (!isAuthenticated && !requiresMFA) return <Navigate to="/login" />;
  if (requiresMFA) return <Navigate to="/mfa" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, requiresMFA } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <RegisterPage />} />
      <Route path="/mfa" element={requiresMFA ? <MFAPage /> : <Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<ProtectedRoute roles={['ADMIN', 'ANALYST']}><UsersPage /></ProtectedRoute>} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="policies" element={<ProtectedRoute roles={['ADMIN']}><PoliciesPage /></ProtectedRoute>} />
        <Route path="logs" element={<ProtectedRoute roles={['ADMIN', 'ANALYST']}><LogsPage /></ProtectedRoute>} />
        <Route path="threats" element={<ThreatsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="analytics" element={<ProtectedRoute roles={['ADMIN', 'ANALYST']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
