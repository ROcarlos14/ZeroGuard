import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Laptop, Smartphone, Tablet, Server, Shield, X, CheckCircle, XCircle } from 'lucide-react';
import { devicesAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

const typeIcon: Record<string, any> = { DESKTOP: Monitor, LAPTOP: Laptop, MOBILE: Smartphone, TABLET: Tablet, SERVER: Server };

export default function DevicesPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<any>(null);
  const [showPosture, setShowPosture] = useState(false);
  const [postureForm, setPostureForm] = useState({ isEncrypted: false, hasAntivirus: false, isOsUpToDate: false, hasFirewall: false, screenLockEnabled: false });

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({ name: '', type: 'DESKTOP', operatingSystem: '', ipAddress: '' });

  const { data } = useQuery({ queryKey: ['devices'], queryFn: () => devicesAPI.list().then(r => r.data.data) });

  const toggleTrust = useMutation({
    mutationFn: ({ id, isTrusted }: { id: string; isTrusted: boolean }) => devicesAPI.setTrust(id, { isTrusted: !isTrusted }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  const submitPosture = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => devicesAPI.submitPosture(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); setShowPosture(false); },
  });

  const registerDevice = useMutation({
    mutationFn: () => devicesAPI.register(newDeviceForm),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['devices'] }); 
      setShowRegisterModal(false); 
      setNewDeviceForm({ name: '', type: 'DESKTOP', operatingSystem: '', ipAddress: '' }); 
    },
  });

  const devices = data || [];

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Device Management</h1>
          <p className="page-subtitle">Monitor device trust and posture compliance</p>
        </div>
        <button onClick={() => setShowRegisterModal(true)} className="btn-primary flex items-center gap-2">
          <Monitor className="w-4 h-4" /> Register Device
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zg-border">
                {['Device', 'OS', 'IP', 'Trust', 'Trust Score', 'Posture', 'Last Seen', 'Actions'].map(h => (
                  <th key={h} className="text-left p-3 text-xs text-zg-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((device: any) => {
                const Icon = typeIcon[device.type] || Monitor;
                return (
                  <tr key={device.id} className="border-b border-zg-border/50 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-zg-muted" />
                        <div>
                          <p className="text-white font-medium">{device.name}</p>
                          <p className="text-xs text-zg-muted">{device.user?.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-zg-muted text-xs">{device.operatingSystem}</td>
                    <td className="p-3 font-mono text-xs text-zg-muted">{device.ipAddress}</td>
                    <td className="p-3">
                      {user?.role === 'ADMIN' ? (
                        <button onClick={() => toggleTrust.mutate({ id: device.id, isTrusted: device.isTrusted })}
                          className={`px-2 py-1 rounded text-xs font-medium ${device.isTrusted ? 'bg-zg-emerald/10 text-zg-emerald' : 'bg-zg-crimson/10 text-zg-crimson'}`}>
                          {device.isTrusted ? 'Trusted' : 'Untrusted'}
                        </button>
                      ) : (
                        <span className={device.isTrusted ? 'text-zg-emerald text-xs' : 'text-zg-crimson text-xs'}>
                          {device.isTrusted ? 'Trusted' : 'Untrusted'}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zg-bg overflow-hidden">
                          <div className={`h-full rounded-full ${device.trustScore >= 70 ? 'bg-zg-emerald' : device.trustScore >= 50 ? 'bg-zg-amber' : 'bg-zg-crimson'}`}
                            style={{ width: `${device.trustScore}%` }} />
                        </div>
                        <span className="text-xs font-mono text-zg-muted">{device.trustScore}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zg-bg overflow-hidden">
                          <div className={`h-full rounded-full ${(device.posture?.postureScore || 0) >= 60 ? 'bg-zg-cyan' : 'bg-zg-amber'}`}
                            style={{ width: `${device.posture?.postureScore || 0}%` }} />
                        </div>
                        <span className="text-xs font-mono text-zg-muted">{device.posture?.postureScore || 0}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-zg-muted">{new Date(device.lastSeen).toLocaleDateString()}</td>
                    <td className="p-3">
                      <button onClick={() => { setSelected(device); setPostureForm({
                        isEncrypted: device.posture?.isEncrypted || false, hasAntivirus: device.posture?.hasAntivirus || false,
                        isOsUpToDate: device.posture?.isOsUpToDate || false, hasFirewall: device.posture?.hasFirewall || false,
                        screenLockEnabled: device.posture?.screenLockEnabled || false,
                      }); setShowPosture(true); }}
                        className="text-xs text-zg-cyan hover:underline">Posture Check</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Posture Check Modal */}
      {showPosture && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPosture(false)}>
          <div className="glass-card w-full max-w-md p-6 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-heading font-bold text-white">Device Posture Check</h3>
              <button onClick={() => setShowPosture(false)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-zg-muted mb-4">{selected.name}</p>
            <div className="space-y-3">
              {[
                { key: 'isEncrypted', label: 'Disk Encryption', pts: 25 },
                { key: 'hasAntivirus', label: 'Antivirus Active', pts: 20 },
                { key: 'isOsUpToDate', label: 'OS Up to Date', pts: 25 },
                { key: 'hasFirewall', label: 'Firewall Enabled', pts: 20 },
                { key: 'screenLockEnabled', label: 'Screen Lock', pts: 10 },
              ].map(item => (
                <label key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-zg-bg/50 cursor-pointer hover:bg-zg-bg/80">
                  <div className="flex items-center gap-3">
                    {(postureForm as any)[item.key]
                      ? <CheckCircle className="w-5 h-5 text-zg-emerald" />
                      : <XCircle className="w-5 h-5 text-zg-crimson" />}
                    <span className="text-sm text-white">{item.label}</span>
                    <span className="text-xs text-zg-muted">+{item.pts}pts</span>
                  </div>
                  <input type="checkbox" checked={(postureForm as any)[item.key]}
                    onChange={e => setPostureForm({ ...postureForm, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded accent-zg-cyan" />
                </label>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-zg-bg/50">
              <p className="text-sm text-zg-muted">Estimated Score: <span className="text-white font-bold font-mono">
                {(postureForm.isEncrypted ? 25 : 0) + (postureForm.hasAntivirus ? 20 : 0) + (postureForm.isOsUpToDate ? 25 : 0) +
                 (postureForm.hasFirewall ? 20 : 0) + (postureForm.screenLockEnabled ? 10 : 0)}/100</span></p>
            </div>
            <button onClick={() => submitPosture.mutate({ id: selected.id, data: postureForm })}
              className="w-full btn-primary mt-4">Submit Posture Check</button>
          </div>
        </div>
      )}
      {/* Register Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRegisterModal(false)}>
          <div className="w-full max-w-md bg-zg-surface rounded-xl border border-zg-border p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold font-heading text-white">Register New Device</h2>
              <button onClick={() => setShowRegisterModal(false)} className="text-zg-muted hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Device Name</label>
                <input type="text" className="input-field" value={newDeviceForm.name} onChange={e => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })} placeholder="My Macbook Pro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zg-muted mb-1">Type</label>
                  <select className="input-field" value={newDeviceForm.type} onChange={e => setNewDeviceForm({ ...newDeviceForm, type: e.target.value })}>
                    <option value="DESKTOP">DESKTOP</option>
                    <option value="LAPTOP">LAPTOP</option>
                    <option value="MOBILE">MOBILE</option>
                    <option value="TABLET">TABLET</option>
                    <option value="SERVER">SERVER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zg-muted mb-1">Operating System</label>
                  <input type="text" className="input-field" value={newDeviceForm.operatingSystem} onChange={e => setNewDeviceForm({ ...newDeviceForm, operatingSystem: e.target.value })} placeholder="macOS 14.0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">IP Address</label>
                <input type="text" className="input-field" value={newDeviceForm.ipAddress} onChange={e => setNewDeviceForm({ ...newDeviceForm, ipAddress: e.target.value })} placeholder="192.168.1.100" />
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={() => setShowRegisterModal(false)} className="flex-1 btn-ghost border border-zg-border">Cancel</button>
                <button onClick={() => registerDevice.mutate()} className="flex-1 btn-primary" disabled={registerDevice.isPending || !newDeviceForm.name || !newDeviceForm.operatingSystem}>
                  {registerDevice.isPending ? 'Registering...' : 'Register Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
