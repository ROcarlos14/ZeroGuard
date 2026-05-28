import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Shield, Zap, MapPin, UserX, Monitor, FileWarning } from 'lucide-react';
import { threatsAPI } from '../services/api';
import { getSeverityBadgeClass, timeAgo } from '../utils/helpers';

const typeIcons: Record<string, any> = { BRUTE_FORCE: Zap, ANOMALOUS_LOCATION: MapPin, PRIVILEGE_ESCALATION: Shield,
  SESSION_HIJACK: UserX, SUSPICIOUS_DEVICE: Monitor, POLICY_VIOLATION: FileWarning };

export default function ThreatsPage() {
  const qc = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');

  const { data } = useQuery({ queryKey: ['threats', severityFilter, resolvedFilter],
    queryFn: () => threatsAPI.list({ severity: severityFilter || undefined, resolved: resolvedFilter || undefined, limit: 50 }).then(r => r.data) });
  const { data: stats } = useQuery({ queryKey: ['threatStats'], queryFn: () => threatsAPI.stats().then(r => r.data.data) });

  const resolve = useMutation({
    mutationFn: (id: string) => threatsAPI.resolve(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['threats'] }); qc.invalidateQueries({ queryKey: ['threatStats'] }); },
  });

  const alerts = data?.data || [];
  const severityCounts = stats?.bySeverity || {};

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Threat Alerts</h1>
        <p className="page-subtitle">Monitor and respond to security threats</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
          <div key={sev} className="glass-card p-4 text-center">
            <p className="text-2xl font-bold font-heading text-white">{severityCounts[sev] || 0}</p>
            <span className={getSeverityBadgeClass(sev)}>{sev}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Severities</option>
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={resolvedFilter} onChange={e => setResolvedFilter(e.target.value)} className="input-field w-auto">
          <option value="">All</option><option value="false">Unresolved</option><option value="true">Resolved</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alerts.map((alert: any) => {
          const Icon = typeIcons[alert.type] || AlertTriangle;
          return (
            <div key={alert.id} className={`glass-card p-5 ${alert.isResolved ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    alert.severity === 'CRITICAL' ? 'bg-zg-crimson/10' : alert.severity === 'HIGH' ? 'bg-orange-500/10' : 'bg-zg-amber/10'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      alert.severity === 'CRITICAL' ? 'text-zg-crimson' : alert.severity === 'HIGH' ? 'text-orange-400' : 'text-zg-amber'
                    }`} />
                  </div>
                  <span className={getSeverityBadgeClass(alert.severity)}>{alert.severity}</span>
                </div>
                <span className="text-xs text-zg-muted">{timeAgo(alert.createdAt)}</span>
              </div>
              <h3 className={`font-semibold text-white mb-1 ${alert.isResolved ? 'line-through' : ''}`}>{alert.title}</h3>
              <p className="text-xs text-zg-muted mb-3">{alert.description}</p>
              <div className="flex items-center justify-between">
                <span className="badge bg-zg-card text-zg-muted">{alert.type.replace(/_/g, ' ')}</span>
                {!alert.isResolved && (
                  <button onClick={() => resolve.mutate(alert.id)} className="text-xs text-zg-emerald hover:underline flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Resolve
                  </button>
                )}
                {alert.isResolved && <span className="text-xs text-zg-emerald">Resolved</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
