import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { api, type AdvanceTourAlertItem } from '../lib/api';
import { useLanguage } from '../i18n/LanguageContext';
import { triggerDriverHaptic } from '../lib/formatters';

export const AdvanceTourNotificationBanner: React.FC = () => {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState<AdvanceTourAlertItem[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const loadAlerts = async () => {
    try {
      const data = await api.getAdvanceAlerts();
      setAlerts(data);

      // Trigger browser notification if permission granted and alerts found
      if (
        data.length > 0 &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const topAlert = data[0];
        const daysLabel =
          topAlert.days_until_tour === 0
            ? t.upcomingTourToday(topAlert.title)
            : topAlert.days_until_tour === 1
            ? t.upcomingTourTomorrow(topAlert.title)
            : t.upcomingTourInDays(topAlert.days_until_tour, topAlert.title);

        // Check if already notified in this session
        const sessionKey = `fleetos_notified_${topAlert.id}_${topAlert.days_until_tour}`;
        if (!sessionStorage.getItem(sessionKey)) {
          sessionStorage.setItem(sessionKey, 'true');
          new Notification('FleetOS 23-Seater Tour Reminder 🔔', {
            body: `${daysLabel}\nCustomer: ${topAlert.customer_name}\nRoute: ${topAlert.destination}`,
            icon: '/vite.svg',
          });
        }
      }
    } catch (err) {
      console.warn('Could not fetch advance alerts:', err);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = async () => {
    triggerDriverHaptic([40]);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          triggerDriverHaptic([60, 40]);
          loadAlerts();
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  if (isDismissed || alerts.length === 0) {
    return null;
  }

  const primaryAlert = alerts[0];
  const isUrgent = primaryAlert.days_until_tour <= 1;

  return (
    <div
      className={`w-full px-4 py-2 transition border-b flex flex-col md:flex-row items-center justify-between gap-2 text-xs font-mono ${
        isUrgent
          ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
          : 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-900 text-teal-900 dark:text-teal-200'
      }`}
    >
      <div className="flex items-center space-x-2.5 flex-1 min-w-0">
        <div
          className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
            isUrgent
              ? 'bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
              : 'bg-teal-200/70 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-slate-900 dark:text-zinc-100">
            {primaryAlert.days_until_tour === 0
              ? t.upcomingTourToday(primaryAlert.title)
              : primaryAlert.days_until_tour === 1
              ? t.upcomingTourTomorrow(primaryAlert.title)
              : t.upcomingTourInDays(primaryAlert.days_until_tour, primaryAlert.title)}
          </div>
          <div className="text-[11px] opacity-80 truncate flex items-center space-x-2">
            <span>👤 {primaryAlert.customer_name}</span>
            <span>•</span>
            <span>📍 {primaryAlert.destination}</span>
            {alerts.length > 1 && (
              <span className="font-bold underline ml-1">
                (+{alerts.length - 1} more)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
        {notificationPermission === 'default' && (
          <button
            onClick={handleRequestPermission}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-[11px] font-semibold text-slate-800 dark:text-zinc-200 transition flex items-center space-x-1"
          >
            <Bell className="w-3 h-3 text-teal-600 dark:text-teal-400" />
            <span>{t.enableNotificationsBtn}</span>
          </button>
        )}

        <button
          onClick={() => {
            triggerDriverHaptic([30]);
            setIsDismissed(true);
          }}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-current opacity-70 hover:opacity-100 transition"
          title={t.notificationBannerDismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const NotificationBellButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { t } = useLanguage();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const data = await api.getAdvanceAlerts();
        setCount(data.length);
      } catch {
        // Silent fallback
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={() => {
        triggerDriverHaptic([30]);
        onClick();
      }}
      className="relative min-h-[44px] min-w-[44px] p-2 rounded-md bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition flex items-center justify-center active:scale-95"
      title={t.notificationBellTooltip}
      aria-label={t.notificationBellTooltip}
    >
      <Bell className="w-4 h-4" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold font-mono rounded-full bg-amber-500 text-white tabular-nums shadow-xs">
          {count}
        </span>
      )}
    </button>
  );
};
