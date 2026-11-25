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
      <div className="w-full max-w-md p-6 md:p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-700 dark:text-teal-400 mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-sans text-slate-900 dark:text-zinc-50 tracking-tight">Fleet Admin Portal</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
            Vinoth Travels • TN37AW6052 (23-Seater)
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 font-mono flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-slate-700 dark:text-zinc-300 mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2.5 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase text-slate-700 dark:text-zinc-300 mb-1.5">
              Admin Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full min-h-[48px] rounded-md bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold tracking-wide flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-xs"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Operations Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 text-center text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
          Protected by Argon2 &amp; HS256 JWT • Session expires in 24 hours
        </div>
      </div>
    </div>
  );
};
