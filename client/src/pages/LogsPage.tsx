import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Filter } from 'lucide-react';
import { logsAPI } from '../services/api';
import { getOutcomeBadgeClass, formatDate, downloadCSV } from '../utils/helpers';

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ outcome: '', minRisk: '', startDate: '', endDate: '' });

  const { data } = useQuery({
    queryKey: ['logs', page, filters],
    queryFn: () => logsAPI.list({ page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }).then(r => r.data),
  });

  const logs = data?.data || [];
  const pagination = data?.pagination;

  const handleExport = () => {
    const csv = logs.map((l: any) => ({
      Timestamp: formatDate(l.timestamp), User: l.user?.username || l.userId,
      Resource: l.resource?.name || l.resourceId, Action: l.action,
      Outcome: l.outcome, RiskScore: l.riskScore, Reason: l.reason || '',
      IP: l.ipAddress,
    }));
    downloadCSV(csv, 'zeroguard-access-logs.csv');
  };

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Access Logs</h1><p className="page-subtitle">Detailed audit trail of all resource access attempts</p></div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2"><Download className="w-4 h-4" />Export CSV</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={filters.outcome} onChange={e => { setFilters({ ...filters, outcome: e.target.value }); setPage(1); }} className="input-field w-auto">
          <option value="">All Outcomes</option>
          <option value="ALLOWED">Allowed</option><option value="DENIED">Denied</option><option value="CHALLENGED">Challenged</option>
        </select>
        <input type="number" placeholder="Min Risk Score" value={filters.minRisk}
          onChange={e => { setFilters({ ...filters, minRisk: e.target.value }); setPage(1); }} className="input-field w-40" />
        <input type="date" value={filters.startDate} onChange={e => { setFilters({ ...filters, startDate: e.target.value }); setPage(1); }} className="input-field w-auto" />
        <input type="date" value={filters.endDate} onChange={e => { setFilters({ ...filters, endDate: e.target.value }); setPage(1); }} className="input-field w-auto" />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zg-border">
                {['Timestamp', 'User', 'Resource', 'Action', 'Outcome', 'Risk', 'Reason', 'IP'].map(h =>
                  <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-zg-border/50 hover:bg-white/[0.02]">
                  <td className="p-3 text-xs font-mono text-zg-muted whitespace-nowrap">{formatDate(log.timestamp)}</td>
                  <td className="p-3 text-white">{log.user?.username || 'Unknown'}</td>
                  <td className="p-3 text-zg-text">{log.resource?.name || 'Unknown'}</td>
                  <td className="p-3 text-xs text-zg-muted">{log.action}</td>
                  <td className="p-3"><span className={getOutcomeBadgeClass(log.outcome)}>{log.outcome}</span></td>
                  <td className="p-3">
                    <span className={`font-mono text-xs ${log.riskScore > 50 ? 'text-zg-crimson' : log.riskScore > 20 ? 'text-zg-amber' : 'text-zg-emerald'}`}>
                      {log.riskScore}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-zg-muted max-w-[200px] truncate" title={log.reason}>{log.reason || '—'}</td>
                  <td className="p-3 text-xs font-mono text-zg-muted">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-zg-muted">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost disabled:opacity-30">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages} className="btn-ghost disabled:opacity-30">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
