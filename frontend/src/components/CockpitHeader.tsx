import React from 'react';
import { Bus, QrCode, LayoutDashboard, Smartphone, Languages } from 'lucide-react';
import { triggerDriverHaptic } from '../lib/formatters';
import { useLanguage } from '../i18n/LanguageContext';
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

  return (
    <header className="bg-[#090D16] border-b border-[#1E293B] px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Vehicle Badge */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-white tracking-tight">{t.appName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1E293B] border border-[#334155] text-slate-300 font-mono">
                TN37aw6052
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-[#94A3B8]">
              <span className="text-[#10B981] font-semibold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block mr-1"></span>
                {t.busSubtitle}
              </span>
              <span>•</span>
              <span className="text-slate-400">{t.coachName}</span>
            </div>
          </div>
        </div>

        {/* View Switcher, Language Toggle & QR Code Launch */}
        <div className="flex items-center space-x-2">
          {/* Language Toggle Pill (48px Touch Target) */}
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              toggleLanguage();
            }}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#10B981]/50 text-xs font-bold text-[#10B981] flex items-center space-x-1.5 transition active:scale-95"
            title="Toggle Language / மொழி மாற்றுக"
          >
            <Languages className="w-4 h-4 text-[#10B981]" />
            <span className="font-mono tracking-wider">{t.langToggle}</span>
          </button>

          {/* View Toggle */}
          <div className="flex bg-[#0F172A] p-1 rounded-xl border border-[#1E293B]">
            <button
              onClick={() => {
                triggerDriverHaptic([40]);
                onViewChange('driver');
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                currentView === 'driver'
                  ? 'bg-[#10B981] text-[#090D16]'
                  : 'text-slate-400 hover:text-white'
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
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                currentView === 'admin'
                  ? 'bg-[#10B981] text-[#090D16]'
                  : 'text-slate-400 hover:text-white'
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
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#0F172A] border border-[#1E293B] hover:border-[#334155] text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95"
            title={t.scanQr}
          >
            <QrCode className="w-5 h-5 text-[#10B981]" />
          </button>
        </div>
      </div>
    </header>
  );
};
