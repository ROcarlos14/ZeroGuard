import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Users, Monitor, Shield, FileText, AlertTriangle,
  BarChart3, Settings, User, FolderLock, ChevronLeft, ChevronRight,
} from 'lucide-react';
import ZeroGuardLogo from '../ZeroGuardLogo';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users', roles: ['ADMIN', 'ANALYST'] },
  { to: '/devices', icon: Monitor, label: 'Devices' },
  { to: '/resources', icon: FolderLock, label: 'Resources' },
  { to: '/policies', icon: Shield, label: 'Policies', roles: ['ADMIN'] },
  { to: '/logs', icon: FileText, label: 'Access Logs', roles: ['ADMIN', 'ANALYST'] },
  { to: '/threats', icon: AlertTriangle, label: 'Threats' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['ADMIN', 'ANALYST'] },
  { to: '/profile', icon: User, label: 'My Profile' },
  { to: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
];

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { user } = useAuthStore();
  const location = useLocation();

  const filteredItems = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className={`${open ? 'w-64' : 'w-16'} flex flex-col bg-zg-surface border-r border-zg-border transition-all duration-300 relative z-20`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-zg-border">
        <ZeroGuardLogo size={32} className="shrink-0" />
        {open && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-lg font-bold font-heading text-white leading-none">ZeroGuard</h1>
            <p className="text-[10px] text-zg-cyan tracking-widest uppercase">ZTNA Platform</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center mx-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 group
              ${isActive
                ? 'bg-zg-cyan/10 border border-zg-cyan text-zg-cyan shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                : 'text-zg-muted hover:text-white hover:bg-white/5 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {open && <span className="ml-3 text-sm font-medium truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      {open && user && (
        <div className="p-4 border-t border-zg-border">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-zg-cyan/20 flex items-center justify-center text-zg-cyan font-bold text-sm">
              {user.username[0].toUpperCase()}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-zg-muted truncate">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-zg-surface border border-zg-border flex items-center justify-center text-zg-muted hover:text-zg-cyan transition-colors"
      >
        {open ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
    </aside>
  );
}
