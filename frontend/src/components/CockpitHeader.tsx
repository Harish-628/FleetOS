import React from 'react';
import { Bus, QrCode, LayoutDashboard, Smartphone, Languages, Sun, Moon } from 'lucide-react';
import { triggerDriverHaptic } from '../lib/formatters';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { NotificationBellButton } from './AdvanceTourNotificationBanner';

interface HeaderProps {
  currentView: 'driver' | 'admin';
  onViewChange: (view: 'driver' | 'admin') => void;
  onOpenQrModal: () => void;
  onOpenAlerts?: () => void;
}

export const CockpitHeader: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenQrModal,
  onOpenAlerts,
}) => {
  const { t, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-4 py-2.5 transition-colors duration-150">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Vehicle Badge */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
            <Bus className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-slate-900 dark:text-zinc-50 tracking-tight truncate">
                {t.appName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-mono font-medium">
                TN37AW6052
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-zinc-400 truncate">
              <span className="text-teal-700 dark:text-teal-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400 inline-block mr-1"></span>
                {t.busSubtitle}
              </span>
              <span>•</span>
              <span className="text-slate-600 dark:text-zinc-400">{t.coachName}</span>
            </div>
          </div>
        </div>

        {/* Action Controls: Theme, Language, View Switcher & QR Code Launch */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Theme Toggle (Sun / Moon) - 44px tap target */}
          <button
            onClick={() => {
              triggerDriverHaptic([25]);
              toggleTheme();
            }}
            className="min-h-[44px] min-w-[44px] p-2 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition active:scale-95"
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
            className="min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-teal-600 dark:hover:border-teal-500 text-xs font-semibold text-slate-700 dark:text-zinc-200 flex items-center space-x-1.5 transition active:scale-95"
            title="Toggle Language / மொழி மாற்றுக"
          >
            <Languages className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span className="font-mono tracking-wider">{t.langToggle}</span>
          </button>

          {/* Desktop/Tablet View Switcher (Desktop only; mobile uses bottom nav) */}
          <div className="hidden md:flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
            <button
              onClick={() => {
                triggerDriverHaptic([40]);
                onViewChange('driver');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded transition ${
                currentView === 'driver'
                  ? 'bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{t.driverPwa}</span>
            </button>
            <button
              onClick={() => {
                triggerDriverHaptic([40]);
                onViewChange('admin');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded transition ${
                currentView === 'admin'
                  ? 'bg-white dark:bg-zinc-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.adminPortal}</span>
            </button>
          </div>

          {/* 5-Day Advance Alerts Notification Bell */}
          <NotificationBellButton onClick={onOpenAlerts || onOpenQrModal} />

          {/* QR Code button */}
          <button
            onClick={() => {
              triggerDriverHaptic([40]);
              onOpenQrModal();
            }}
            className="min-h-[44px] min-w-[44px] p-2 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center transition active:scale-95"
            title={t.scanQr}
          >
            <QrCode className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
