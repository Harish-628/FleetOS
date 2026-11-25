import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { triggerDriverHaptic } from '../../lib/formatters';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    triggerDriverHaptic([40]);

    try {
      await api.login(username, password);
      triggerDriverHaptic([60, 40]);
      onLoginSuccess();
    } catch (err: any) {
      triggerDriverHaptic([100, 50, 100]);
      setError(err?.message || 'Invalid admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md cockpit-card p-6 md:p-8 border-[#1E293B] bg-gradient-to-br from-[#0F172A] to-[#0A0E17] shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981] mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold font-sans text-white tracking-tight">Fleet Admin Portal</h2>
          <p className="text-xs text-slate-400 font-mono">
            Vinoth Travels • TN37aw6052 (23-Seater)
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/80 text-xs text-red-200 font-mono flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="cockpit-input w-full font-mono text-sm"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="cockpit-input w-full font-mono text-sm"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="cockpit-btn-primary w-full text-sm font-bold tracking-wide flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Operations Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#1E293B] text-center text-[11px] text-slate-500 font-mono">
          Protected by Argon2 &amp; HS256 JWT • Session expires in 24 hours
        </div>
      </div>
    </div>
  );
};
