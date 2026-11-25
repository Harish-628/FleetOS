import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle, Bus, Crown, Shield, Eye, EyeOff, Sparkles } from 'lucide-react';
import { api, type DriverSession } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { triggerDriverHaptic } from '../../lib/formatters';

interface UnifiedLoginProps {
  onLoginSuccess: (role: 'driver' | 'admin', session?: DriverSession) => void;
}

export const UnifiedLogin: React.FC<UnifiedLoginProps> = ({ onLoginSuccess }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanUser = username.trim().toLowerCase();
  const isAdminTarget = cleanUser === 'admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    triggerDriverHaptic([40]);
    setIsLoading(true);
    setError(null);

    try {
      if (isAdminTarget) {
        // Authenticate via Admin portal login
        await api.login(cleanUser, password);
        triggerDriverHaptic([60, 40]);
        onLoginSuccess('admin');
      } else {
        // Authenticate via Driver Cockpit login (handles offline fallback for senthilraja)
        const session = await api.driverLogin(cleanUser, password);
        triggerDriverHaptic([60, 40]);
        onLoginSuccess('driver', session);
      }
    } catch (err: any) {
      triggerDriverHaptic([100, 50, 100]);
      // Never show raw 404 "Not Found" to users
      const errMsg = err?.message === 'Not Found' 
        ? (isAdminTarget ? 'Incorrect admin username or password' : 'Invalid driver username or password')
        : (err?.message || (isAdminTarget ? 'Incorrect admin password' : 'Invalid driver credentials'));
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (u: string, p: string) => {
    triggerDriverHaptic([20]);
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[78vh] relative overflow-hidden">
      {/* Luxury Background Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 dark:bg-amber-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand & Vehicle Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center p-1 rounded-2xl bg-gradient-to-br from-amber-400/20 via-slate-100 to-emerald-400/20 dark:from-amber-400/10 dark:via-zinc-800 dark:to-emerald-400/10 border border-amber-300/40 dark:border-amber-500/30 shadow-lg shadow-amber-500/5">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-center text-amber-400 border border-amber-400/20 shadow-inner">
              <Bus className="w-7 h-7" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 font-sans">
                {t.appName}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-yellow-950/40 border border-amber-400/60 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-xs">
                TN37AW6052
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium tracking-wide">
              {t.unifiedLoginSubheading}
            </p>
          </div>
        </div>

        {/* Elite Login Card */}
        <div className="p-6 md:p-8 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-black/40 space-y-5">
          {/* Detected Role Badge indicator */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800/80 text-xs font-medium">
            <span className="text-slate-500 dark:text-zinc-400">Target Console:</span>
            {isAdminTarget ? (
              <span className="inline-flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold font-mono">
                <Shield className="w-3.5 h-3.5 text-amber-500" />
                <span>{t.roleDetectedAdmin}</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                {cleanUser === 'senthilraja' ? (
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Bus className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span>{cleanUser === 'senthilraja' ? 'Owner-Driver Cockpit' : t.roleDetectedDriver}</span>
              </span>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* User ID Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                {t.userIdLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={t.userIdPlaceholder}
                  required
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-3 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                {t.passwordLabel || 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 text-base md:text-sm font-mono text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="w-full min-h-[50px] rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 dark:from-amber-500 dark:to-yellow-600 text-white dark:text-slate-950 text-sm font-bold tracking-wide flex items-center justify-center space-x-2 transition shadow-lg shadow-amber-600/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Operations'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Credential Pre-fill Helpers for Ease of Use */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Quick Access Credentials:</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickSelect('senthilraja', 'senthilraja123')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left border border-slate-200 dark:border-zinc-700 transition flex flex-col cursor-pointer"
              >
                <span className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>Driver</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                  senthilraja
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('admin', 'fleetadmin2026!')}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-left border border-slate-200 dark:border-zinc-700 transition flex flex-col cursor-pointer"
              >
                <span className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 truncate">
                  admin
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="text-center text-[11px] text-slate-400 dark:text-zinc-500 font-mono space-y-1">
          <div>Vinoth Travels Commercial Logistics ERP • TN37AW6052</div>
          <div>Role-Based Access Control • Offline-Ready Field PWA</div>
        </div>
      </div>
    </div>
  );
};
