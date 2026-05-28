import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, User, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Dashboard', users: 'Users', devices: 'Devices', resources: 'Resources',
  policies: 'Policies', logs: 'Access Logs', threats: 'Threats', profile: 'My Profile',
  analytics: 'Analytics', settings: 'Settings',
};

export default function Navbar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  useSocket('threat_alert', (data: any) => {
    setAlerts(prev => [data, ...prev].slice(0, 10));
    setAlertCount(prev => prev + 1);
  });

  const segments = location.pathname.split('/').filter(Boolean);
  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-zg-border bg-zg-surface/80 backdrop-blur-sm flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden text-zg-muted hover:text-zg-text">
          <Menu className="w-5 h-5" />
        </button>
        <nav className="flex items-center text-sm">
          <span className="text-zg-muted">Home</span>
          {segments.map((s, i) => (
            <span key={i} className="flex items-center">
              <ChevronRight className="w-4 h-4 text-zg-muted/50 mx-1" />
              <span className={i === segments.length - 1 ? 'text-white font-medium' : 'text-zg-muted'}>
                {breadcrumbMap[s] || s}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotif(!showNotif); setAlertCount(0); }}
            className="relative p-2 rounded-lg text-zg-muted hover:text-zg-text hover:bg-white/5 transition-colors">
            <Bell className="w-5 h-5" />
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-zg-crimson rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                {alertCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-80 glass-card p-3 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-semibold text-white mb-2">Recent Alerts</h3>
              {alerts.length === 0 ? (
                <p className="text-xs text-zg-muted py-4 text-center">No new alerts</p>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="py-2 border-b border-zg-border last:border-0">
                    <p className="text-xs font-medium text-white">{a.title}</p>
                    <p className="text-xs text-zg-muted mt-0.5">{a.description}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setShowUser(!showUser)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 rounded-full bg-zg-cyan/20 flex items-center justify-center text-zg-cyan font-bold text-xs">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm text-zg-text hidden sm:block">{user?.username}</span>
          </button>

          {showUser && (
            <div className="absolute right-0 top-12 w-48 glass-card py-1">
              <button onClick={() => { navigate('/profile'); setShowUser(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zg-muted hover:text-white hover:bg-white/5">
                <User className="w-4 h-4" /> Profile
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zg-crimson hover:bg-zg-crimson/10">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
