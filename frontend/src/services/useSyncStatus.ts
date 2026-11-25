import { useEffect, useState } from 'react';
import { syncEngine, type SyncStatusState } from './syncEngine';

export function useSyncStatus(): SyncStatusState & { flushSync: () => Promise<void> } {
  const [status, setStatus] = useState<SyncStatusState>(syncEngine.getState());

  useEffect(() => {
    return syncEngine.subscribe(setStatus);
  }, []);

  return {
    ...status,
    flushSync: () => syncEngine.flushSyncQueue(),
  };
}
