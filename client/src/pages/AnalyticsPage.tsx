import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { analyticsAPI, logsAPI } from '../services/api';

const COLORS = ['#00d4ff', '#00ff88', '#ffaa00', '#ff3366', '#a855f7', '#3b82f6'];

export default function AnalyticsPage() {
  const { data: dashData } = useQuery({ queryKey: ['analytics-dash'], queryFn: () => analyticsAPI.dashboard().then(r => r.data.data) });
  const { data: timeline } = useQuery({ queryKey: ['analytics-timeline'], queryFn: () => logsAPI.timeline().then(r => r.data.data) });
  const { data: riskUsers } = useQuery({ queryKey: ['risk-matrix'], queryFn: () => analyticsAPI.riskMatrix().then(r => r.data.data) });
  const { data: topResources } = useQuery({ queryKey: ['analytics-top'], queryFn: () => logsAPI.topResources().then(r => r.data.data) });

  // Generate simulated weekly data
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), allowed: Math.floor(Math.random() * 40 + 20), denied: Math.floor(Math.random() * 15 + 3), challenged: Math.floor(Math.random() * 10 + 2) };
  });

  // Risk heatmap data
  const heatmapRows = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
    const hours: Record<string, number> = {};
    for (let h = 0; h < 24; h++) hours[`${h}`] = Math.floor(Math.random() * 100);
    return { day, ...hours };
  });

  const deviceDist = [
    { name: 'Desktop', value: 35 }, { name: 'Laptop', value: 30 }, { name: 'Mobile', value: 20 },
    { name: 'Tablet', value: 10 }, { name: 'Server', value: 5 },
  ];

  const complianceTrend = Array.from({ length: 30 }, (_, i) => ({
    day: `Day ${i + 1}`, score: Math.floor(Math.random() * 20 + 70),
  }));

  return (
    <div>
      <div className="page-header"><h1 className="page-title">Analytics</h1><p className="page-subtitle">Deep-dive security analytics and reporting</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Weekly Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Weekly Access Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Area type="monotone" dataKey="allowed" stackId="1" fill="#00ff8830" stroke="#00ff88" />
              <Area type="monotone" dataKey="denied" stackId="1" fill="#ff336630" stroke="#ff3366" />
              <Area type="monotone" dataKey="challenged" stackId="1" fill="#ffaa0030" stroke="#ffaa00" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Access */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Resources</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topResources || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} width={140} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="accessCount" fill="#00d4ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Risk Heatmap */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Score Heatmap (7×24)</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="flex gap-0.5">
                <div className="w-10" />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-zg-muted">{h}</div>
                ))}
              </div>
              {heatmapRows.map((row) => (
                <div key={row.day} className="flex gap-0.5 mb-0.5">
                  <div className="w-10 text-xs text-zg-muted flex items-center">{row.day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const val = (row as any)[`${h}`] || 0;
                    const opacity = val / 100;
                    return (
                      <div key={h} className="flex-1 h-6 rounded-sm" title={`${row.day} ${h}:00 — Risk: ${val}`}
                        style={{ backgroundColor: `rgba(255, 51, 102, ${opacity * 0.8})` }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Device Distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Device Type Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={deviceDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {deviceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compliance Trend */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Posture Compliance Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={complianceTrend}>
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} interval={4} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2035', border: '1px solid #1e293b', borderRadius: '8px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="score" stroke="#00d4ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Riskiest Users */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top 10 Riskiest Users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-zg-border">
                {['User', 'Dept', 'Role', 'Risk'].map(h => <th key={h} className="text-left p-2 text-zg-muted">{h}</th>)}
              </tr></thead>
              <tbody>
                {(riskUsers || []).slice(0, 10).map((u: any) => (
                  <tr key={u.id} className="border-b border-zg-border/30">
                    <td className="p-2 text-white">{u.username}</td>
                    <td className="p-2 text-zg-muted">{u.department}</td>
                    <td className="p-2 text-zg-muted">{u.role}</td>
                    <td className="p-2">
                      <span className={`font-mono font-bold ${u.riskScore > 50 ? 'text-zg-crimson' : u.riskScore > 20 ? 'text-zg-amber' : 'text-zg-emerald'}`}>{u.riskScore}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
