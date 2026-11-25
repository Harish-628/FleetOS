export interface TripApiItem {
  id: string;
  client_event_id: string;
  vehicle_id: string;
  customer_name: string;
  destination: string;
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
  status: 'IN_PROGRESS' | 'COMPLETED';
  start_time: string;
  end_time?: string;
  total_fuel_amount_inr: number;
  total_fuel_liters: number;
  net_profit_inr: number;
  mileage_kmpl: number;
  created_at: string;
  updated_at: string;
}

export interface DriverSession {
  username: string;
  full_name: string;
  is_owner_driver: boolean;
  access_token: string;
  expires_in?: number;
}

export interface DriverApiItem {
  id: string;
  username: string;
  full_name: string;
  is_owner_driver: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AdvanceTourAlertItem {
  id: string;
  title: string;
  customer_name: string;
  destination: string;
  phone?: string;
  start_time: string;
  end_time: string;
  days_until_tour: number;
  color_id: string;
  status: string;
}

export interface BookingCalendarEventCreatePayload {
  title: string;
  customer_name: string;
  destination?: string;
  phone?: string;
  start_time: string;
  end_time: string;
  color_id?: string;
  status?: string;
}

export interface FuelReceiptApiItem {
  id: string;
  client_event_id: string;
  trip_id: string;
  customer_name?: string;
  amount_inr: number;
  liters?: number;
  receipt_image_url?: string;
  recorded_at: string;
  created_at: string;
}

export interface ComplianceItem {
  name: string;
  code: string;
  expiry_date: string;
  days_remaining: number;
  status: 'GREEN' | 'AMBER' | 'RED';
  status_label: string;
}

export interface ComplianceApiResponse {
  vehicle_id: string;
  items: ComplianceItem[];
  has_expired: boolean;
  requires_attention: boolean;
}

export interface CalendarEventItem {
  id: string;
  google_calendar_event_id?: string;
  title: string;
  customer_name: string;
  destination?: string;
  phone?: string;
  start_time: string;
  end_time: string;
  color_id: string; // "10" Green, "5" Yellow, "11" Red
  status: string;
}

export interface TodayBookingSuggestion {
  customer_name: string;
  destination: string;
  phone?: string;
  start_time: string;
  color_id: string;
  slot_id?: string;
}

export interface DriverCalendarSlot {
  id: string;
  summary: string;
  customer_name: string;
  destination?: string;
  phone?: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'pending' | 'maintenance';
  color_id: string;
}


export interface SyncBatchPayload {
  client_device_id: string;
  batch_id: string;
  sent_at: string;
  events: Array<{
    client_event_id: string;
    event_type: 'TRIP_START' | 'FUEL_LOG' | 'TRIP_END';
    recorded_at: string;
    payload: Record<string, any>;
  }>;
}

export interface SyncBatchResponse {
  batch_id: string;
  processed_at: string;
  processed_count: number;
  deduplicated_count: number;
  rejected_count: number;
  results: Array<{
    client_event_id: string;
    status: 'processed' | 'deduplicated' | 'rejected';
    entity_type: string;
    server_id?: string;
    message?: string;
  }>;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api/v1';

// Token & Session Management
const ADMIN_TOKEN_KEY = 'fleetos_admin_token';
const DRIVER_KEY_STORAGE = 'fleetos_driver_key';
const DRIVER_SESSION_KEY = 'fleetos_driver_session';
const DEFAULT_DRIVER_KEY = 'driver-cockpit-secret-key-2026';

let onAuthErrorCallback: (() => void) | null = null;

export const setOnAuthError = (cb: () => void) => {
  onAuthErrorCallback = cb;
};

export const getAdminToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
};

export const setAdminToken = (token: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  }
};

export const clearAdminToken = () => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  }
};

export const getDriverKey = (): string => {
  if (typeof window === 'undefined') return DEFAULT_DRIVER_KEY;
  return localStorage.getItem(DRIVER_KEY_STORAGE) || DEFAULT_DRIVER_KEY;
};

export const setDriverKey = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRIVER_KEY_STORAGE, key);
  }
};

export const getDriverSession = (): DriverSession | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(DRIVER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setDriverSession = (session: DriverSession) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRIVER_SESSION_KEY, JSON.stringify(session));
  }
};

export const clearDriverSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DRIVER_SESSION_KEY);
  }
};

const adminFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = getAdminToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAdminToken();
    if (onAuthErrorCallback) {
      onAuthErrorCallback();
    }
    throw new Error('Admin session expired or unauthorized (401)');
  }
  return response;
};

const driverFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const driverKey = getDriverKey();
  const session = getDriverSession();
  const headers = new Headers(options.headers || {});
  headers.set('X-Driver-Key', driverKey);
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  return fetch(url, { ...options, headers });
};

export const api = {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  getDriverKey,
  setDriverKey,
  getDriverSession,
  setDriverSession,
  clearDriverSession,

  async login(username: string, password: string): Promise<LoginResponse> {
    const cleanUser = username.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      if (res.ok) {
        const data: LoginResponse = await res.json();
        setAdminToken(data.access_token);
        return data;
      }
      if (res.status === 401) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Incorrect admin username or password');
      }
      // If 404 or server error, proceed to fallback check below
    } catch (networkOrApiErr: any) {
      if (networkOrApiErr?.message === 'Incorrect admin username or password') {
        throw networkOrApiErr;
      }
      // Network failed or 404: continue to offline fallback
    }

    // Offline / Standalone Fallback for Fleet Admin
    if (cleanUser === 'admin' && (password === 'fleetadmin2026!' || password === 'admin123')) {
      const offlineToken = 'offline-admin-token-' + Date.now();
      setAdminToken(offlineToken);
      return {
        access_token: offlineToken,
        token_type: 'bearer',
        expires_in: 86400,
      };
    }

    throw new Error('Incorrect admin username or password');
  },

  async driverLogin(username: string, password: string): Promise<DriverSession> {
    const cleanUser = username.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/auth/driver-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const session: DriverSession = {
          username: data.username,
          full_name: data.full_name,
          is_owner_driver: data.is_owner_driver,
          access_token: data.access_token,
          expires_in: data.expires_in,
        };
        setDriverSession(session);
        return session;
      }
      if (res.status === 401) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Invalid driver username or password');
      }
      // If 404 or server error, proceed to fallback check below
    } catch (networkOrApiErr: any) {
      if (networkOrApiErr?.message === 'Invalid driver username or password') {
        throw networkOrApiErr;
      }
      // Network failed or 404: continue to offline fallback
    }

    // Offline / Standalone Fallback for Primary Owner-Driver (Senthilraja)
    if (cleanUser === 'senthilraja' && (password === 'senthilraja123' || password === 'senthil123')) {
      const session: DriverSession = {
        username: 'senthilraja',
        full_name: 'Senthilraja',
        is_owner_driver: true,
        access_token: 'offline-driver-token-' + Date.now(),
        expires_in: 2592000,
      };
      setDriverSession(session);
      return session;
    }

    throw new Error('Invalid driver username or password');
  },

  async getDrivers(): Promise<DriverApiItem[]> {
    const res = await adminFetch(`${API_BASE}/auth/drivers`);
    if (!res.ok) throw new Error('Failed to fetch drivers list');
    return res.json();
  },

  async createDriver(data: {
    username: string;
    password: string;
    full_name: string;
    is_owner_driver: boolean;
  }): Promise<DriverApiItem> {
    const res = await adminFetch(`${API_BASE}/auth/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create driver account');
    }
    return res.json();
  },

  async getTrips(params?: { customer_name?: string; status?: string }): Promise<TripApiItem[]> {
    const q = new URLSearchParams();
    if (params?.customer_name) q.set('customer_name', params.customer_name);
    if (params?.status) q.set('status', params.status);
    const res = await adminFetch(`${API_BASE}/trips?${q.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch trips: ${res.statusText}`);
    return res.json();
  },

  async getActiveTrip(): Promise<TripApiItem | null> {
    const res = await adminFetch(`${API_BASE}/trips/active`);
    if (!res.ok) throw new Error('Failed to fetch active trip');
    return res.json();
  },

  async getFuelReceipts(): Promise<FuelReceiptApiItem[]> {
    const res = await adminFetch(`${API_BASE}/fuel`);
    if (!res.ok) throw new Error(`Failed to fetch fuel receipts: ${res.statusText}`);
    return res.json();
  },

  async getCompliance(): Promise<ComplianceApiResponse> {
    const res = await adminFetch(`${API_BASE}/compliance`);
    if (!res.ok) throw new Error('Failed to fetch compliance status');
    return res.json();
  },

  async getCalendarEvents(): Promise<CalendarEventItem[]> {
    // Accessible by Admin or Driver
    const token = getAdminToken();
    let res: Response;
    if (token) {
      res = await adminFetch(`${API_BASE}/calendar`);
    } else {
      res = await driverFetch(`${API_BASE}/calendar`);
    }
    if (!res.ok) throw new Error('Failed to fetch calendar events');
    return res.json();
  },

  async createCalendarEvent(data: BookingCalendarEventCreatePayload): Promise<CalendarEventItem> {
    const token = getAdminToken();
    const session = getDriverSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    headers['X-Driver-Key'] = getDriverKey();

    const res = await fetch(`${API_BASE}/calendar/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create tour booking');
    }
    return res.json();
  },

  async getAdvanceAlerts(): Promise<AdvanceTourAlertItem[]> {
    const res = await driverFetch(`${API_BASE}/calendar/advance-alerts`);
    if (!res.ok) throw new Error('Failed to fetch advance alerts');
    return res.json();
  },

  async getTodayBookingSuggestion(): Promise<TodayBookingSuggestion | null> {
    const res = await driverFetch(`${API_BASE}/calendar/today`);
    if (!res.ok) {
      // Try alias fallback
      const fallback = await driverFetch(`${API_BASE}/calendar/today-bookings`);
      if (!fallback.ok) return null;
      return fallback.json();
    }
    return res.json();
  },

  async getDriverSlots(): Promise<DriverCalendarSlot[]> {
    const res = await driverFetch(`${API_BASE}/calendar/driver-slots`);
    if (!res.ok) throw new Error('Failed to fetch driver slots');
    return res.json();
  },

  async uploadReceipt(file: File): Promise<{ url: string; filename: string; size_bytes: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await driverFetch(`${API_BASE}/uploads/receipt`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Receipt upload failed');
    }
    return res.json();
  },

  async syncBatch(payload: SyncBatchPayload): Promise<SyncBatchResponse> {
    const res = await driverFetch(`${API_BASE}/sync/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Sync batch failed: ${res.statusText}`);
    }
    return res.json();
  },
};
