import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Check, X } from 'lucide-react';
import ZeroGuardLogo from '../components/ZeroGuardLogo';
import { authAPI } from '../services/api';

const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'Operations', 'IT', 'Legal', 'Marketing', 'Executive'];

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', department: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = (() => {
    const p = form.password;
    if (!p) return { level: 0, label: '', color: '' };
    let s = 0;
    if (p.length >= 8) s++; if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
    if (s <= 1) return { level: 1, label: 'Weak', color: 'bg-zg-crimson' };
    if (s <= 2) return { level: 2, label: 'Medium', color: 'bg-zg-amber' };
    return { level: 3, label: 'Strong', color: 'bg-zg-emerald' };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.register({ username: form.username, email: form.email, password: form.password, department: form.department });
      if (data.success) navigate('/login');
    } catch (err: any) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const ua = navigator.userAgent;
  const deviceName = /Windows/.test(ua) ? 'Windows PC' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Unknown';

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="hex-bg" />
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-zg-purple/5 rounded-full blur-3xl animate-pulse-slow" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card p-8">
          <div className="text-center mb-6">
            <ZeroGuardLogo size={40} className="mx-auto mb-2" />
            <h1 className="text-xl font-bold font-heading text-white">Create Account</h1>
            <p className="text-xs text-zg-muted mt-1">Join the Zero Trust network</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && <div className="p-3 rounded-lg bg-zg-crimson/10 border border-zg-crimson/20 text-sm text-zg-crimson">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Username</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  className="input-field" placeholder="johndoe" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-zg-muted mb-1">Department</label>
                <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                  className="input-field" required>
                  <option value="">Select...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zg-muted mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="input-field" placeholder="you@zeroguard.local" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zg-muted mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                className="input-field" placeholder="••••••••" required />
              {form.password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-zg-border overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all`} style={{ width: `${(strength.level / 3) * 100}%` }} />
                  </div>
                  <span className={`text-xs ${strength.level === 3 ? 'text-zg-emerald' : strength.level === 2 ? 'text-zg-amber' : 'text-zg-crimson'}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-zg-muted mb-1">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                className="input-field" placeholder="••••••••" required />
              {form.confirmPassword && (
                <div className="flex items-center gap-1 mt-1 text-xs">
                  {form.password === form.confirmPassword
                    ? <><Check className="w-3 h-3 text-zg-emerald" /><span className="text-zg-emerald">Passwords match</span></>
                    : <><X className="w-3 h-3 text-zg-crimson" /><span className="text-zg-crimson">Passwords don't match</span></>
                  }
                </div>
              )}
            </div>
            <div className="p-2 rounded-lg bg-zg-bg/50 border border-zg-border text-xs text-zg-muted">
              📱 Device will be registered: <span className="text-zg-text">{deviceName} — {navigator.platform}</span>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-zg-muted mt-4">
            Already have an account? <Link to="/login" className="text-zg-cyan hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
