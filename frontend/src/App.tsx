import { useState, useEffect } from 'react';
import { SyncStatusBadge } from './components/SyncStatusBadge';
import { CockpitHeader } from './components/CockpitHeader';
import { DriverDashboard } from './features/driver/DriverDashboard';
import { AdminPortal } from './features/admin/AdminPortal';
import { DriverQrModal } from './components/DriverQrModal';
import { LanguageProvider } from './i18n/LanguageContext';

export function AppContent() {
  const [currentView, setCurrentView] = useState<'driver' | 'admin'>('driver');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Sync hash routing if specified
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'admin') setCurrentView('admin');
      if (hash === 'driver') setCurrentView('driver');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleViewChange = (view: 'driver' | 'admin') => {
    setCurrentView(view);
    window.location.hash = view;
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col">
      {/* 1. Persistent Top Sync Status Badge */}
      <SyncStatusBadge />

      {/* 2. Cockpit Header with Duty Status & View Toggle */}
      <CockpitHeader
        currentView={currentView}
        onViewChange={handleViewChange}
        onOpenQrModal={() => setIsQrModalOpen(true)}
      />

      {/* 3. Main Views */}
      <main className="flex-1 overflow-y-auto">
        {currentView === 'driver' ? (
          <DriverDashboard />
        ) : (
          <AdminPortal />
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
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;

