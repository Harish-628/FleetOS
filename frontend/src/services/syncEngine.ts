import { db, type LocalSyncQueueItem, type LocalCalendarSlot } from '../db/fleet_db';
import { api, type SyncBatchPayload, type DriverCalendarSlot } from '../lib/api';
import { generateUUID } from '../lib/uuid';

export type SyncStatusState = {
  isOnline: boolean;
  isSyncing: boolean;
  queuedCount: number;
  lastSyncedAt: Date | null;
  lastError: string | null;
};

type Listener = (state: SyncStatusState) => void;

class SyncEngine {
  private state: SyncStatusState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    queuedCount: 0,
    lastSyncedAt: null,
    lastError: null,
  };

  private listeners = new Set<Listener>();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineChange(true));
      window.addEventListener('offline', () => this.handleOnlineChange(false));
      this.refreshQueuedCount();
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public async refreshQueuedCount(): Promise<number> {
    try {
      const count = await db.sync_queue.where('status').equals('PENDING').count();
      this.state.queuedCount = count;
      this.notify();
      return count;
    } catch {
      return 0;
    }
  }

  private async handleOnlineChange(online: boolean) {
    this.state.isOnline = online;
    this.notify();
    if (online) {
      await this.flushSyncQueue();
      await this.refreshDriverSlots();
    }
  }

  /**
   * Fetches latest driver slots when online and caches them into Dexie calendarSlots.
   * Seamlessly returns cached Dexie slots if offline or if network fails.
   */
  public async refreshDriverSlots(): Promise<LocalCalendarSlot[]> {
    if (this.state.isOnline) {
      try {
        const slots: DriverCalendarSlot[] = await api.getDriverSlots();
        if (slots && slots.length > 0) {
          const now = new Date().toISOString();
          const itemsToSave: LocalCalendarSlot[] = slots.map((s: any) => ({
            id: s.id,
            summary: s.summary,
            customer_name: s.customer_name,
            destination: s.destination,
            phone: s.phone,
            start_time: s.start_time,
            end_time: s.end_time,
            status: s.status,
            color_id: s.color_id,
            cached_at: now,
          }));
          await db.calendarSlots.clear();
          await db.calendarSlots.bulkPut(itemsToSave);
          return itemsToSave;
        }
      } catch (err) {
        console.warn('Could not fetch remote driver slots, falling back to cache:', err);
      }
    }

    // Return cached slots from Dexie
    return await db.calendarSlots.toArray();
  }

  /**
   * Enqueues an offline mutation to Dexie sync_queue and triggers flush if online.
   */
  public async queueEvent(
    eventType: 'TRIP_START' | 'FUEL_LOG' | 'TRIP_END',
    clientEventId: string,
    payload: Record<string, any>,
    recordedAt?: string
  ): Promise<void> {
    const queueItem: LocalSyncQueueItem = {
      client_event_id: clientEventId,
      event_type: eventType,
      payload,
      recorded_at: recordedAt || new Date().toISOString(),
      retry_count: 0,
      status: 'PENDING',
    };

    await db.sync_queue.add(queueItem);
    await this.refreshQueuedCount();

    // Auto-flush if currently online
    if (this.state.isOnline) {
      this.flushSyncQueue().catch((err) => console.warn('Background sync attempt:', err));
    }
  }

  /**
   * Flushes all queued mutations in a single batch to POST /api/v1/sync/batch
   */
  public async flushSyncQueue(): Promise<void> {
    if (this.state.isSyncing) return;

    const pendingItems = await db.sync_queue
      .where('status')
      .equals('PENDING')
      .toArray();

    if (pendingItems.length === 0) {
      this.state.queuedCount = 0;
      this.notify();
      return;
    }

    this.state.isSyncing = true;
    this.state.lastError = null;
    this.notify();

    try {
      const payload: SyncBatchPayload = {
        client_device_id: 'driver-cockpit-pwa',
        batch_id: generateUUID(),
        sent_at: new Date().toISOString(),
        events: pendingItems.map((item: LocalSyncQueueItem) => ({
          client_event_id: item.client_event_id,
          event_type: item.event_type,
          recorded_at: item.recorded_at,
          payload: item.payload,
        })),
      };

      const response = await api.syncBatch(payload);

      // On success, mark local records as synced and remove from queue
      for (const res of response.results) {
        if (res.status === 'processed' || res.status === 'deduplicated') {
          // Remove from sync_queue
          await db.sync_queue
            .where('client_event_id')
            .equals(res.client_event_id)
            .delete();

          // Mark in local trips or fuel receipts as synced
          await db.trips
            .where('client_event_id')
            .equals(res.client_event_id)
            .modify({ synced: true });

          await db.fuel_receipts
            .where('client_event_id')
            .equals(res.client_event_id)
            .modify({ synced: true });
        }
      }

      this.state.lastSyncedAt = new Date();
      await this.refreshQueuedCount();
    } catch (err: any) {
      console.error('Failed to flush offline sync queue:', err);
      this.state.lastError = err?.message || 'Network sync error';
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }
  }

  public getState(): SyncStatusState {
    return { ...this.state };
  }
}

export const syncEngine = new SyncEngine();
