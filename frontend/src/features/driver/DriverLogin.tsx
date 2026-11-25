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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0F172A] border border-[#1E293B] shadow-lg shadow-black/40">
            <Bus className="w-7 h-7 text-[#10B981]" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {t.driverLoginHeading}
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            {t.driverLoginSubheading}
          </p>
        </div>

        {/* Login Form */}
        <div className="cockpit-card p-5 bg-[#0F172A]/90 border border-[#1E293B] shadow-xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-500/80 text-red-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.driverUsernameLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. senthilraja"
                  required
                  autoCapitalize="none"
                  className="cockpit-input w-full pl-9 pr-3 py-2.5 text-sm font-mono text-white bg-[#090D16] border border-[#1E293B] rounded-lg focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t.driverPasswordLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="cockpit-input w-full pl-9 pr-3 py-2.5 text-sm font-mono text-white bg-[#090D16] border border-[#1E293B] rounded-lg focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="cockpit-btn-primary w-full min-h-[48px] text-sm font-bold flex items-center justify-center space-x-2 mt-2"
            >
              <span>{isLoading ? t.driverLoggingIn : t.driverLoginBtn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500 font-mono">
          Vinoth Travels • TN37aw6052 (23-Seater)
        </p>
      </div>
    </div>
  );
};
