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
    <div className="w-full flex items-center justify-between px-3 sm:px-4 py-1.5 bg-slate-100 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 transition-colors duration-150">
      {/* Status Pill */}
      <div className="flex items-center space-x-2">
        {isOnline && queuedCount === 0 ? (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
            <span className="text-[11px] font-semibold tracking-wider uppercase font-mono">
              {t.onlineSynced}
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-800 dark:text-amber-400">
            {isOnline ? (
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-bold tracking-wider uppercase font-mono tabular-nums">
              {t.offlineQueued(queuedCount)}
            </span>
          </div>
        )}

        {lastSyncedAt && queuedCount === 0 && (
          <span className="hidden sm:inline-block text-[11px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
            {t.syncedAt(new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
          </span>
        )}
      </div>

      {/* Action / Sync Button */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 transition active:scale-95 disabled:opacity-50"
          title="Manually flush local sync queue"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-teal-600 dark:text-teal-400' : 'text-slate-500 dark:text-zinc-400'}`} />
          <span>{isSyncing ? t.syncing : t.forceSync}</span>
        </button>
      </div>
    </div>
  );
};
