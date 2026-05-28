import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Shield, Monitor, Activity, Lock, Unlock, Loader2 } from 'lucide-react';
import { authAPI, devicesAPI, sessionsAPI, logsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { formatDate, getOutcomeBadgeClass, timeAgo } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'profile' | 'devices' | 'sessions' | 'activity'>('profile');
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [mfaData, setMfaData] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });

  const { data: devices } = useQuery({ queryKey: ['myDevices'], queryFn: () => devicesAPI.list().then(r => r.data.data) });
  const { data: sessions } = useQuery({ queryKey: ['mySessions'], queryFn: () => sessionsAPI.list().then(r => r.data.data) });
  const { data: logs } = useQuery({ queryKey: ['myLogs', user?.id], queryFn: () => user ? logsAPI.list({ userId: user.id, limit: 20 }).then(r => r.data.data) : [] });

  const setupMFA = useMutation({
    mutationFn: () => authAPI.mfaSetup(),
    onSuccess: (res) => { setMfaData(res.data.data); setShowMFASetup(true); },
  });

  const verifyMFA = useMutation({
    mutationFn: () => authAPI.mfaVerify(mfaCode),
    onSuccess: () => { updateUser({ mfaEnabled: true }); setShowMFASetup(false); setMfaCode(''); setMfaError(''); },
    onError: (err: any) => setMfaError(err.response?.data?.error || 'Verification failed. Please try again.'),
  });

  const disableMFA = useMutation({
    mutationFn: () => authAPI.mfaDisable(pwForm.current),
    onSuccess: () => { updateUser({ mfaEnabled: false }); setPwForm({ current: '', newPw: '', confirm: '' }); },
  });

  const terminateSession = useMutation({
    mutationFn: (id: string) => sessionsAPI.terminate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mySessions'] }),
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'devices', label: 'My Devices', icon: Monitor },
    { id: 'sessions', label: 'Sessions', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div>
      <div className="page-header"><h1 className="page-title">My Profile</h1><p className="page-subtitle">Manage your account and security settings</p></div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-zg-border">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id ? 'border-zg-cyan text-zg-cyan' : 'border-transparent text-zg-muted hover:text-white'
            }`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-zg-cyan/10 flex items-center justify-center text-zg-cyan text-2xl font-bold">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{user?.username}</h3>
                <p className="text-sm text-zg-muted">{user?.email}</p>
                <p className="text-xs text-zg-muted mt-1">{user?.role} • {user?.department}</p>
              </div>
            </div>
          </div>

          {/* MFA Section */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-zg-cyan" /> Multi-Factor Authentication
            </h3>
            {user?.mfaEnabled ? (
              <div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-zg-emerald/10 mb-4">
                  <Lock className="w-5 h-5 text-zg-emerald" />
                  <span className="text-sm text-zg-emerald font-medium">MFA Active</span>
                </div>
                <div className="space-y-2">
                  <input type="password" value={pwForm.current} onChange={e => setPwForm({...pwForm, current: e.target.value})}
                    className="input-field" placeholder="Enter password to disable MFA" />
                  <button onClick={() => disableMFA.mutate()} disabled={!pwForm.current} className="btn-danger w-full">Disable MFA</button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zg-muted mb-4">Add an extra layer of security to your account</p>
                <button onClick={() => setupMFA.mutate()} className="btn-primary w-full flex items-center justify-center gap-2">
                  {setupMFA.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Enable MFA
                </button>
              </div>
            )}

            {showMFASetup && mfaData && (
              <div className="mt-4 p-4 rounded-lg bg-zg-bg/50">
                <p className="text-xs text-zg-muted mb-3">Scan this QR code with your authenticator app:</p>
                <img src={mfaData.qrCode} alt="MFA QR Code" className="mx-auto mb-3 rounded" />
                <p className="text-xs text-zg-muted mb-1">Or enter manually:</p>
                <code className="text-xs font-mono text-zg-cyan block bg-zg-bg p-2 rounded mb-3 break-all">{mfaData.secret}</code>
                <input value={mfaCode} onChange={e => { setMfaCode(e.target.value); setMfaError(''); }}
                  className="input-field mb-2" placeholder="Enter 6-digit code" maxLength={6} />
                {mfaError && <div className="mb-3 p-2 rounded bg-zg-crimson/10 border border-zg-crimson/20 text-xs text-zg-crimson">{mfaError}</div>}
                <button onClick={() => verifyMFA.mutate()} disabled={verifyMFA.isPending || mfaCode.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2">
                  {verifyMFA.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {verifyMFA.isPending ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'devices' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zg-border">
              {['Device', 'OS', 'IP', 'Trust', 'Posture', 'Last Seen'].map(h =>
                <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {(devices || []).filter((d: any) => d.userId === user?.id).map((d: any) => (
                <tr key={d.id} className="border-b border-zg-border/50">
                  <td className="p-3 text-white">{d.name}</td>
                  <td className="p-3 text-xs text-zg-muted">{d.operatingSystem}</td>
                  <td className="p-3 text-xs font-mono text-zg-muted">{d.ipAddress}</td>
                  <td className="p-3"><span className={d.isTrusted ? 'text-zg-emerald text-xs' : 'text-zg-crimson text-xs'}>{d.isTrusted ? 'Trusted' : 'Untrusted'}</span></td>
                  <td className="p-3 text-xs font-mono text-zg-muted">{d.posture?.postureScore || 0}/100</td>
                  <td className="p-3 text-xs text-zg-muted">{timeAgo(d.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zg-border">
              {['IP', 'User Agent', 'Created', 'Last Active', 'Status', ''].map(h =>
                <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {(sessions || []).filter((s: any) => s.userId === user?.id).map((s: any) => (
                <tr key={s.id} className="border-b border-zg-border/50">
                  <td className="p-3 font-mono text-xs text-zg-muted">{s.ipAddress}</td>
                  <td className="p-3 text-xs text-zg-muted truncate max-w-[200px]">{s.userAgent}</td>
                  <td className="p-3 text-xs text-zg-muted">{formatDate(s.createdAt)}</td>
                  <td className="p-3 text-xs text-zg-muted">{timeAgo(s.lastActivityAt)}</td>
                  <td className="p-3"><span className={s.isActive ? 'text-zg-emerald text-xs' : 'text-zg-crimson text-xs'}>{s.isActive ? 'Active' : 'Ended'}</span></td>
                  <td className="p-3">{s.isActive && <button onClick={() => terminateSession.mutate(s.id)} className="text-xs text-zg-crimson hover:underline">Terminate</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'activity' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zg-border">
              {['Time', 'Resource', 'Action', 'Outcome', 'Risk'].map(h =>
                <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {(logs || []).map((l: any) => (
                <tr key={l.id} className="border-b border-zg-border/50">
                  <td className="p-3 text-xs font-mono text-zg-muted">{timeAgo(l.timestamp)}</td>
                  <td className="p-3 text-white">{l.resource?.name || 'Unknown'}</td>
                  <td className="p-3 text-xs text-zg-muted">{l.action}</td>
                  <td className="p-3"><span className={getOutcomeBadgeClass(l.outcome)}>{l.outcome}</span></td>
                  <td className="p-3 text-xs font-mono">{l.riskScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
