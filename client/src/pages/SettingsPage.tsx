import { useState } from 'react';
import { Settings as SettingsIcon, Clock, Shield, AlertTriangle, Globe, Database } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    sessionTimeout: 30,
    mfaEnforcement: false,
    riskChallengeThreshold: 50,
    riskDenyThreshold: 70,
    auditRetention: 90,
    allowedIPs: '10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">System Settings</h1>
        <p className="page-subtitle">Configure Zero Trust platform parameters</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Session Timeout */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-zg-cyan" />
            <h3 className="text-sm font-semibold text-white">Session Timeout</h3>
          </div>
          <div className="flex items-center gap-4">
            <input type="range" min={5} max={120} value={settings.sessionTimeout}
              onChange={e => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
              className="flex-1 accent-zg-cyan" />
            <span className="text-lg font-mono text-white w-16 text-right">{settings.sessionTimeout}m</span>
          </div>
          <p className="text-xs text-zg-muted mt-2">Idle sessions will be terminated after this duration (5–120 minutes)</p>
        </div>

        {/* MFA Enforcement */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-zg-emerald" />
              <div>
                <h3 className="text-sm font-semibold text-white">MFA Enforcement</h3>
                <p className="text-xs text-zg-muted mt-0.5">Require MFA for all users on login</p>
              </div>
            </div>
            <button onClick={() => setSettings({ ...settings, mfaEnforcement: !settings.mfaEnforcement })}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.mfaEnforcement ? 'bg-zg-emerald' : 'bg-zg-border'}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.mfaEnforcement ? 'left-6.5 translate-x-0.5' : 'left-0.5'}`}
                style={{ left: settings.mfaEnforcement ? '26px' : '2px' }} />
            </button>
          </div>
        </div>

        {/* Risk Score Thresholds */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-zg-amber" />
            <h3 className="text-sm font-semibold text-white">Risk Score Thresholds</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zg-muted">Challenge Threshold</span>
                <span className="text-zg-amber font-mono">{settings.riskChallengeThreshold}</span>
              </div>
              <input type="range" min={10} max={90} value={settings.riskChallengeThreshold}
                onChange={e => setSettings({ ...settings, riskChallengeThreshold: Number(e.target.value) })}
                className="w-full accent-zg-amber" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zg-muted">Deny Threshold</span>
                <span className="text-zg-crimson font-mono">{settings.riskDenyThreshold}</span>
              </div>
              <input type="range" min={20} max={100} value={settings.riskDenyThreshold}
                onChange={e => setSettings({ ...settings, riskDenyThreshold: Number(e.target.value) })}
                className="w-full accent-zg-crimson" />
            </div>
          </div>
        </div>

        {/* Allowed IPs */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-zg-purple" />
            <h3 className="text-sm font-semibold text-white">Allowed IP Ranges</h3>
          </div>
          <textarea value={settings.allowedIPs} onChange={e => setSettings({ ...settings, allowedIPs: e.target.value })}
            className="input-field h-20 font-mono text-xs" placeholder="CIDR ranges, comma-separated" />
          <p className="text-xs text-zg-muted mt-2">Comma-separated CIDR notation</p>
        </div>

        {/* Audit Retention */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-zg-cyan" />
            <h3 className="text-sm font-semibold text-white">Audit Log Retention</h3>
          </div>
          <select value={settings.auditRetention} onChange={e => setSettings({ ...settings, auditRetention: Number(e.target.value) })}
            className="input-field w-auto">
            <option value={30}>30 days</option><option value={60}>60 days</option>
            <option value={90}>90 days</option><option value={180}>180 days</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary">Save Settings</button>
          {saved && <span className="text-sm text-zg-emerald">✓ Settings saved</span>}
        </div>

        <p className="text-xs text-zg-muted/50 italic">These settings are simulated and stored as key-value configuration</p>
      </div>
    </div>
  );
}
