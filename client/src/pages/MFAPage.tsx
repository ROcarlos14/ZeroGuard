import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function MFAPage() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const setMFAVerified = useAuthStore(s => s.setMFAVerified);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(prev => prev > 0 ? prev - 1 : 30), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (newCode.every(c => c) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otp?: string) => {
    const c = otp || code.join('');
    if (c.length !== 6) { setError('Please enter all 6 digits'); return; }
    setError(''); setLoading(true);
    try {
      const { data } = await authAPI.mfaVerify(c);
      if (data.success) { setMFAVerified(); navigate('/dashboard'); }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="hex-bg" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm mx-4">
        <div className="glass-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zg-emerald/10 mb-4">
            <ShieldCheck className="w-10 h-10 text-zg-emerald" />
          </div>
          <h2 className="text-xl font-bold font-heading text-white">Two-Factor Authentication</h2>
          <p className="text-sm text-zg-muted mt-2">Enter the 6-digit code from your authenticator app</p>

          {error && <div className="mt-4 p-3 rounded-lg bg-zg-crimson/10 border border-zg-crimson/20 text-sm text-zg-crimson">{error}</div>}

          <div className="flex justify-center gap-2 mt-6">
            {code.map((digit, i) => (
              <input key={i} ref={el => { inputs.current[i] = el; }} value={digit}
                onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-mono font-bold bg-zg-bg/50 border border-zg-border rounded-lg text-white focus:border-zg-cyan focus:ring-1 focus:ring-zg-cyan/30 outline-none transition-all"
                maxLength={1} inputMode="numeric" autoFocus={i === 0} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-zg-cyan flex items-center justify-center">
              <span className="text-xs font-mono text-zg-cyan">{countdown}</span>
            </div>
            <span className="text-zg-muted">seconds remaining</span>
          </div>

          <button onClick={() => handleVerify()} disabled={loading || code.some(c => !c)}
            className="w-full btn-primary py-2.5 mt-6 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>

          <button onClick={() => { setCountdown(30); setCode(['', '', '', '', '', '']); inputs.current[0]?.focus(); }}
            disabled={countdown > 0} className="mt-3 text-sm text-zg-muted hover:text-zg-cyan disabled:opacity-50">
            Resend Code
          </button>
        </div>
      </motion.div>
    </div>
  );
}
