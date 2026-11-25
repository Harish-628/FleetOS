import React from 'react';
import { Bus, QrCode, Languages, Sun, Moon, LogOut, Shield, Crown } from 'lucide-react';
import { triggerDriverHaptic } from '../lib/formatters';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { NotificationBellButton } from './AdvanceTourNotificationBanner';

interface HeaderProps {
  currentView?: 'driver' | 'admin' | null;
  onSignOut?: () => void;
  onOpenQrModal: () => void;
  onOpenAlerts?: () => void;
}

export const CockpitHeader: React.FC<HeaderProps> = ({
  currentView,
  onSignOut,
  onOpenQrModal,
  onOpenAlerts,
}) => {
  const { t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-4 py-2.5 transition-colors duration-150 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Vehicle Badge */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 via-slate-100 to-amber-500/20 dark:from-amber-400/10 dark:via-zinc-800 dark:to-amber-500/10 border border-amber-300/40 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
            <Bus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-base font-extrabold text-slate-900 dark:text-zinc-50 tracking-tight truncate font-sans">
                {t.appName}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950/60 dark:to-yellow-950/40 border border-amber-400/60 dark:border-amber-500/50 text-amber-900 dark:text-amber-200 font-mono font-bold tracking-wider shadow-2xs">
                TN37AW6052
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              <span className="text-amber-700 dark:text-amber-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1 animate-pulse"></span>
                {t.busSubtitle}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Theme, Language, Notifications, Active Role & Sign Out */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Active Role Status Badge (if logged in) */}
          {currentView && (
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono">
              {currentView === 'admin' ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-800 dark:text-zinc-200 font-semibold">{t.adminPortal}</span>
                </>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-800 dark:text-zinc-200 font-semibold">{t.driverPwa}</span>
                </>
              )}
            </div>
          )}

          {/* Theme Toggle (Sun / Moon) - 44px tap target */}
          <button
            onClick={() => {
              triggerDriverHaptic([25]);
              toggleTheme();
            }}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Language Toggle Pill (44px min tap target) */}
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              toggleLanguage();
            }}
            className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-amber-500/50 dark:hover:border-amber-400/50 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
            title="Toggle Language / மொழி மாற்றுக"
          >
            <Languages className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span className="font-mono tracking-wider">{t.langToggle}</span>
          </button>

          {/* 5-Day Advance Alerts Notification Bell */}
          <NotificationBellButton onClick={onOpenAlerts || onOpenQrModal} />

          {/* QR Code button */}
          <button
            onClick={() => {
              triggerDriverHaptic([40]);
              onOpenQrModal();
            }}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs"
            title={t.scanQr}
          >
            <QrCode className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </button>

          {/* Sign Out Button (if logged in) */}
          {currentView && onSignOut && (
            <button
              onClick={() => {
                triggerDriverHaptic([40]);
                onSignOut();
              }}
              className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
              title="Sign Out / வெளியேறு"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">{t.signOut}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
