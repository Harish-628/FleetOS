import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Bus } from 'lucide-react';
import { api, type DriverSession } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { triggerDriverHaptic } from '../../lib/formatters';

interface DriverLoginProps {
  onLoginSuccess: (session: DriverSession) => void;
}

export const DriverLogin: React.FC<DriverLoginProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    triggerDriverHaptic([40]);
    setIsLoading(true);
    setError(null);

    try {
      const session = await api.driverLogin(username.trim(), password);
      triggerDriverHaptic([60, 40]);
      onLoginSuccess(session);
    } catch (err: any) {
      triggerDriverHaptic([100, 50, 100]);
      setError(err?.message || t.invalidDriverCredentials);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[75vh]">
      <div className="w-full max-w-sm space-y-5">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 shadow-xs">
            <Bus className="w-6 h-6 text-teal-700 dark:text-teal-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
            {t.driverLoginHeading}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
            {t.driverLoginSubheading}
          </p>
        </div>

        {/* Login Form */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {t.driverUsernameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. senthilraja"
                  required
                  autoCapitalize="none"
                  className="w-full pl-9 pr-3 py-2.5 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500 focus:ring-1 focus:ring-teal-600 dark:focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                {t.driverPasswordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500 focus:ring-1 focus:ring-teal-600 dark:focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] rounded-md bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-sm font-semibold flex items-center justify-center space-x-2 transition disabled:opacity-50 mt-2"
            >
              <span>{isLoading ? t.driverLoggingIn : t.driverLoginBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
          Vinoth Travels • TN37AW6052 (23-Seater)
        </p>
      </div>
    </div>
  );
};
