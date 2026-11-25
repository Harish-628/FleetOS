import { useState, useEffect } from 'react';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { CockpitHeader } from './components/CockpitHeader';
import { DriverDashboard } from './features/driver/DriverDashboard';
import { AdminPortal } from './features/admin/AdminPortal';
import { UnifiedLogin } from './features/auth/UnifiedLogin';
import { DriverQrModal } from './components/DriverQrModal';
import { LanguageProvider } from './i18n/LanguageContext';
import { ThemeProvider } from './hooks/useTheme';
import { api } from './lib/api';

export function AppContent() {
  const [sessionRole, setSessionRole] = useState<'driver' | 'admin' | null>(() => {
    if (api.getAdminToken()) return 'admin';
    if (api.getDriverSession()) return 'driver';
    return null;
  });

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sync hash routing if specified
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin' && api.getAdminToken()) setSessionRole('admin');
      if (hash === 'driver' && api.getDriverSession()) setSessionRole('driver');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLoginSuccess = (role: 'driver' | 'admin') => {
    setSessionRole(role);
    window.location.hash = role;
  };

  const handleSignOut = () => {
    api.clearAdminToken();
    api.clearDriverSession();
    setSessionRole(null);
    window.location.hash = '';
  };

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-50 flex flex-col pb-safe transition-colors duration-150">
      {/* 1. Persistent Top Sync Status Badge */}
      <SyncStatusBadge />

      {/* 2. Cockpit Header with Duty Status & Role Actions */}
      <CockpitHeader
        currentView={sessionRole}
        onSignOut={sessionRole ? handleSignOut : undefined}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* 3. Main Views (Unified Login when logged out, or respective console) */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {sessionRole === null ? (
          <UnifiedLogin onLoginSuccess={handleLoginSuccess} />
        ) : sessionRole === 'driver' ? (
          <DriverDashboard onLogout={handleSignOut} />
        ) : (
          <AdminPortal onLogout={handleSignOut} />
        )}
      </main>

      {/* 4. Dashboard QR Launch Modal */}
      <DriverQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
