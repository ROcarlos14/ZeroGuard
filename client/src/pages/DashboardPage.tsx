import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Monitor, Shield, FolderLock, Activity, AlertTriangle, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { analyticsAPI, logsAPI, threatsAPI } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { formatDate, getOutcomeBadgeClass, getSeverityBadgeClass, timeAgo } from '../utils/helpers';

const COLORS = { allowed: '#00ff88', denied: '#ff3366', challenged: '#ffaa00' };

function KPICard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const step = Math.ceil(value / 30);
    const timer = setInterval(() => setDisplay(prev => prev >= value ? value : prev + step), 30);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zg-muted uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold font-heading text-white mt-1">{display}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: dashData } = useQuery({ queryKey: ['dashboard'], queryFn: () => analyticsAPI.dashboard().then(r => r.data.data), refetchInterval: 30000 });
  const { data: timeline } = useQuery({ queryKey: ['timeline'], queryFn: () => logsAPI.timeline().then(r => r.data.data), refetchInterval: 30000 });
  const { data: topResources } = useQuery({ queryKey: ['topResources'], queryFn: () => logsAPI.topResources().then(r => r.data.data) });
  const [liveFeed, setLiveFeed] = useState<any[]>([]);

  useSocket('access_event', (data: any) => setLiveFeed(prev => [data, ...prev].slice(0, 15)));

  const kpis = dashData ? [
    { icon: Users, label: 'Total Users', value: dashData.totalUsers, color: '#00d4ff' },
    { icon: Activity, label: 'Active Sessions', value: dashData.activeSessions, color: '#00ff88' },
    { icon: Monitor, label: 'Devices', value: dashData.registeredDevices, color: '#a855f7' },
    { icon: FolderLock, label: 'Resources', value: dashData.protectedResources, color: '#ffaa00' },
    { icon: Shield, label: 'Access Today', value: (dashData.accessToday?.allowed || 0) + (dashData.accessToday?.denied || 0) + (dashData.accessToday?.challenged || 0), color: '#00d4ff' },
    { icon: AlertTriangle, label: 'Active Threats', value: dashData.activeThreats, color: '#ff3366' },
  ] : [];

  const pieData = dashData ? [
    { name: 'Allowed', value: dashData.accessToday?.allowed || 0, color: COLORS.allowed },
    { name: 'Denied', value: dashData.accessToday?.denied || 0, color: COLORS.denied },
    { name: 'Challenged', value: dashData.accessToday?.challenged || 0, color: COLORS.challenged },
  ] : [];

  const riskData = dashData ? Object.entries(dashData.riskDistribution || {}).map(([k, v]) => ({ range: k, count: v as number })) : [];
  const compliance = dashData?.postureCompliance;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Security Dashboard</h1>
        <p className="page-subtitle">Real-time Zero Trust security overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi, i) => <KPICard key={i} {...kpi} />)}
      </div>

      {/* Row 1: Line chart + Pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Access Attempts — Last 24 Hours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timeline || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickFormatter={(v) => typeof v === 'string' ? v : ''} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="allowed" stroke={COLORS.allowed} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="denied" stroke={COLORS.denied} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="challenged" stroke={COLORS.challenged} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4">Outcome Distribution</h3>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0', zIndex: 50 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((e, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
                <span className="text-zg-muted">{e.name}: {e.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Top resources + Risk distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top 5 Most Accessed Resources</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topResources || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} width={120} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="accessCount" fill="#00d4ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Score Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskData}>
              <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Threats + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Threat Alerts</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(dashData?.topThreats || []).map((alert: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-zg-bg/50">
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'CRITICAL' ? 'text-zg-crimson' : alert.severity === 'HIGH' ? 'text-orange-400' : 'text-zg-amber'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                    <span className={getSeverityBadgeClass(alert.severity)}>{alert.severity}</span>
                  </div>
                  <p className="text-xs text-zg-muted mt-0.5 line-clamp-1">{alert.description}</p>
                </div>
              </div>
            ))}
            {(!dashData?.topThreats?.length) && <p className="text-xs text-zg-muted text-center py-4">No active threats</p>}
          </div>
        </div>
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            Live Access Feed
            <span className="w-2 h-2 rounded-full bg-zg-emerald animate-pulse" />
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {liveFeed.length === 0 && <p className="text-xs text-zg-muted text-center py-4">Waiting for access events...</p>}
            {liveFeed.map((event, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-zg-bg/30 text-xs">
                {event.outcome === 'ALLOWED' ? <CheckCircle className="w-3.5 h-3.5 text-zg-emerald shrink-0" /> :
                  event.outcome === 'DENIED' ? <XCircle className="w-3.5 h-3.5 text-zg-crimson shrink-0" /> :
                  <HelpCircle className="w-3.5 h-3.5 text-zg-amber shrink-0" />}
                <span className="text-zg-muted font-mono">{event.timestamp ? timeAgo(event.timestamp) : 'now'}</span>
                <span className="text-white font-medium">{event.username}</span>
                <span className="text-zg-muted">→</span>
                <span className="text-zg-text truncate">{event.resourceName}</span>
                <span className={getOutcomeBadgeClass(event.outcome)}>{event.outcome}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Posture Compliance Bar */}
      {compliance && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-white">Device Posture Compliance</h3>
            <span className="text-sm font-mono text-zg-emerald">{compliance.percentage}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-zg-bg/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-zg-emerald to-zg-cyan rounded-full transition-all duration-1000"
              style={{ width: `${compliance.percentage}%` }} />
          </div>
          <p className="text-xs text-zg-muted mt-2">
            <span className="text-zg-emerald">{compliance.compliant} Compliant</span> / <span className="text-zg-crimson">{compliance.nonCompliant} Non-Compliant</span>
          </p>
        </div>
      )}
    </div>
  );
}
