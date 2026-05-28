import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import ZeroGuardLogo from '../components/ZeroGuardLogo';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await authAPI.login(email, password);
      if (data.success) {
        login(data.data);
        if (data.data.requiresMFA) navigate('/mfa');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="hex-bg" />
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-zg-cyan/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-zg-emerald/5 rounded-full blur-3xl animate-pulse-slow" />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4">
        <div className="glass-card p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zg-cyan/10 mb-4">
              <ZeroGuardLogo size={40} />
            </div>
            <h1 className="text-2xl font-bold font-heading text-white">ZeroGuard</h1>
            <p className="text-xs text-zg-cyan tracking-[0.3em] uppercase mt-1">Never Trust. Always Verify.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-zg-crimson/10 border border-zg-crimson/20 text-sm text-zg-crimson">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zg-muted mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="admin@zeroguard.local" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-zg-muted mb-1.5">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pr-10" placeholder="••••••••" required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zg-muted hover:text-zg-text">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs">
              <label className="flex items-center gap-2 text-zg-muted">
                <input type="checkbox" className="rounded border-zg-border" /> Remember me
              </label>
              <span className="text-zg-cyan cursor-pointer hover:underline">Forgot password?</span>
            </div>
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-zg-muted mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-zg-cyan hover:underline">Register</Link>
          </p>
        </div>

        <p className="text-center text-xs text-zg-muted/50 mt-4">
          Zero Trust Network Architecture Platform v1.0
        </p>
      </motion.div>
    </div>
  );
}
