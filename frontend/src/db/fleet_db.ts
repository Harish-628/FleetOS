import Dexie, { type EntityTable } from 'dexie';

export interface LocalTrip {
  id?: number;
  client_event_id: string;
  vehicle_id: string;
  customer_name: string;
  destination: string;
  calendar_event_id?: string;
  start_km: number;
  end_km?: number;
  total_km?: number;
  cash_received_inr: number;
  tolls_and_extras_inr: number;
  toll_amount_inr?: number;
  rto_amount_inr?: number;
  parking_amount_inr?: number;
  other_expenses_inr?: number;
  driver_bata_inr?: number;
  driver_username?: string;
  is_owner_driver?: boolean;
  status: 'IN_PROGRESS' | 'COMPLETED';
  start_time: string;
  end_time?: string;
  created_at: string;
  synced: boolean;
}

export interface LocalCalendarSlot {
  id: string;
  summary: string;
  customer_name: string;
  destination?: string;
  phone?: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'pending' | 'maintenance';
  color_id: string;
  cached_at: string;
}

export interface LocalFuelReceipt {
  id?: number;
  client_event_id: string;
  trip_id: string; // client_event_id of the trip
  amount_inr: number;
  liters?: number;
  receipt_image_data?: string; // compressed base64 or blob URL
  receipt_image_url?: string;
  recorded_at: string;
  created_at: string;
  synced: boolean;
}

export interface LocalSyncQueueItem {
  id?: number;
  client_event_id: string;
  event_type: 'TRIP_START' | 'FUEL_LOG' | 'TRIP_END';
  payload: Record<string, any>;
  recorded_at: string;
  retry_count: number;
  status: 'PENDING' | 'IN_FLIGHT' | 'FAILED';
  error_message?: string;
}

export class FleetOSDatabase extends Dexie {
  trips!: EntityTable<LocalTrip, 'id'>;
  fuel_receipts!: EntityTable<LocalFuelReceipt, 'id'>;
  sync_queue!: EntityTable<LocalSyncQueueItem, 'id'>;
  calendarSlots!: EntityTable<LocalCalendarSlot, 'id'>;

  constructor() {
    super('FleetOS_Offline_DB');
    this.version(1).stores({
      trips: '++id, client_event_id, status, created_at, synced',
      fuel_receipts: '++id, client_event_id, trip_id, recorded_at, synced',
      sync_queue: '++id, client_event_id, event_type, status, retry_count',
    });
    this.version(2).stores({
      trips: '++id, client_event_id, status, created_at, synced, calendar_event_id',
      fuel_receipts: '++id, client_event_id, trip_id, recorded_at, synced',
      sync_queue: '++id, client_event_id, event_type, status, retry_count',
      calendarSlots: 'id, status, start_time, cached_at',
    });
  }
}

export const db = new FleetOSDatabase();
