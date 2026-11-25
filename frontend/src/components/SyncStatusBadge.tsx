import React from 'react';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useSyncStatus } from '../services/useSyncStatus';
import { triggerDriverHaptic } from '../lib/formatters';
import { useLanguage } from '../i18n/LanguageContext';

export const SyncStatusBadge: React.FC = () => {
  const { isOnline, isSyncing, queuedCount, lastSyncedAt, flushSync } = useSyncStatus();
  const { t } = useLanguage();

  const handleSyncClick = () => {
    triggerDriverHaptic([50]);
    flushSync();
  };

  return (
    <div className="w-full flex items-center justify-between px-3 py-2 bg-[#0F172A] border-b border-[#1E293B] shadow-sm">
      {/* Status Pill */}
      <div className="flex items-center space-x-2">
        {isOnline && queuedCount === 0 ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/40 text-[#10B981]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] pulse-dot" />
            <span className="text-xs font-semibold tracking-wide uppercase font-mono">
              {t.onlineSynced}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/50 text-[#F59E0B]">
            {isOnline ? (
              <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-bold tracking-wide uppercase font-mono">
              {t.offlineQueued(queuedCount)}
            </span>
          </div>
        )}

        {lastSyncedAt && queuedCount === 0 && (
          <span className="hidden sm:inline-block text-[11px] text-[#94A3B8] font-mono">
            {t.syncedAt(new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
          </span>
        )}
      </div>

      {/* Action / Sync Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white transition active:scale-95 disabled:opacity-50"
          title="Manually flush local sync queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#10B981]' : 'text-slate-300'}`} />
          <span>{isSyncing ? t.syncing : t.forceSync}</span>
        </button>
      </div>
    </div>
  );
};
