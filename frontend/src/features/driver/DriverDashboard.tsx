import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  CheckCircle,
  Camera,
  MapPin,
  Receipt,
  AlertCircle,
  Check,
  X,
  Phone,
  Clock,
  Crown,
  User as UserIcon,
  LogOut,
  CalendarDays,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { db, type LocalTrip, type LocalFuelReceipt, type LocalCalendarSlot } from '../../db/fleet_db';
import { syncEngine } from '../../services/syncEngine';
import { generateUUID } from '../../lib/uuid';
import { compressReceiptImage, type CompressedImageResult } from '../../lib/imageCompressor';
import { triggerDriverHaptic } from '../../lib/formatters';
import { api, type DriverSession } from '../../lib/api';
import { useLanguage } from '../../i18n/LanguageContext';
import { VoiceInputField } from '../../components/VoiceInputField';
import { DriverLogin } from './DriverLogin';
import { FullMonthCalendar } from '../../components/FullMonthCalendar';
import { AdvanceTourNotificationBanner } from '../../components/AdvanceTourNotificationBanner';

export const DriverDashboard: React.FC = () => {
  const { t } = useLanguage();

  // Driver Authentication Session
  const [driverSession, setDriverSessionState] = useState<DriverSession | null>(() => api.getDriverSession());
  const [isMonthCalendarOpen, setIsMonthCalendarOpen] = useState(false);

  // Active trip state from IndexedDB
  const [activeTrip, setActiveTrip] = useState<LocalTrip | null>(null);
  const [fuelReceipts, setFuelReceipts] = useState<LocalFuelReceipt[]>([]);

  // Workflow Phase Accordions
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<1 | 2 | 3>(1);

  // Phase 1: Slots & Trip Start form
  const [calendarSlots, setCalendarSlots] = useState<LocalCalendarSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [destination, setDestination] = useState('');
  const [startKm, setStartKm] = useState<number | ''>(142380);

  // Phase 2: Fuel Stop form
  const [fuelAmount, setFuelAmount] = useState<number | ''>('');
  const [fuelLiters, setFuelLiters] = useState<number | ''>('');
  const [receiptImage, setReceiptImage] = useState<CompressedImageResult | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [fuelSuccessMsg, setFuelSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Phase 3: Trip End form
  const [endKm, setEndKm] = useState<number | ''>('');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [tollAmount, setTollAmount] = useState<number | ''>('');
  const [rtoAmount, setRtoAmount] = useState<number | ''>('');
  const [parkingAmount, setParkingAmount] = useState<number | ''>('');
  const [otherExpenses, setOtherExpenses] = useState<number | ''>('');
  const [driverBata, setDriverBata] = useState<number | ''>('');
  const [endKmError, setEndKmError] = useState<string | null>(null);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);

  const totalRoadExpenses = (
    (tollAmount !== '' ? Number(tollAmount) : 0) +
    (rtoAmount !== '' ? Number(rtoAmount) : 0) +
    (parkingAmount !== '' ? Number(parkingAmount) : 0) +
    (otherExpenses !== '' ? Number(otherExpenses) : 0)
  );

  // Load active trip from Dexie
  const loadLocalActiveTrip = async () => {
    try {
      const trip = await db.trips.where('status').equals('IN_PROGRESS').last();
      if (trip) {
        setActiveTrip(trip);
        setActiveWorkflowStep(2); // Advance to fuel or trip end
        // Load receipts for this trip
        const receipts = await db.fuel_receipts
          .where('trip_id')
          .equals(trip.client_event_id)
          .toArray();
        setFuelReceipts(receipts);
      } else {
        setActiveTrip(null);
        setActiveWorkflowStep(1);
        setFuelReceipts([]);
      }
    } catch (err) {
      console.error('Error reading Dexie trip:', err);
    }
  };

  // Load & cache calendar slots (online + offline fallback)
  const loadCalendarSlots = async () => {
    try {
      const slots = await syncEngine.refreshDriverSlots();
      setCalendarSlots(slots);

      // Auto-select today confirmed slot if none selected yet
      if (!selectedSlotId && slots.length > 0) {
        const todaySlot = slots.find((s) => s.status === 'confirmed');
        if (todaySlot) {
          setSelectedSlotId(todaySlot.id);
          setCustomerName(todaySlot.customer_name);
          if (todaySlot.destination) setDestination(todaySlot.destination);
        }
      }
    } catch (err) {
      console.error('Error loading calendar slots:', err);
    }
  };

  useEffect(() => {
    // 1. Capture ?key= from URL into localStorage and clean address bar
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      let key = searchParams.get('key');
      if (!key && window.location.hash.includes('key=')) {
        const hashQuery = window.location.hash.split('?')[1];
        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          key = hashParams.get('key');
        }
      }

      if (key) {
        api.setDriverKey(key);
        if (!api.getDriverSession()) {
          const defaultSession: DriverSession = {
            username: 'senthilraja',
            full_name: 'Senthilraja',
            is_owner_driver: true,
            access_token: '',
          };
          api.setDriverSession(defaultSession);
          setDriverSessionState(defaultSession);
        }
        const cleanUrl = window.location.pathname + '#driver';
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    loadLocalActiveTrip();
    loadCalendarSlots();
  }, []);

  // Handle slot selection
  const handleSelectSlot = (slot: LocalCalendarSlot) => {
    triggerDriverHaptic([40]);
    if (selectedSlotId === slot.id) {
      // Toggle off / clear
      setSelectedSlotId(null);
      setCustomerName('');
      setDestination('');
    } else {
      setSelectedSlotId(slot.id);
      setCustomerName(slot.customer_name);
      setDestination(slot.destination || '');
    }
  };

  const handleManualTrip = () => {
    triggerDriverHaptic([40]);
    setSelectedSlotId(null);
    setCustomerName('');
    setDestination('');
  };

  // Phase 1: Submit Trip Start (100% Offline to Dexie)
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !destination || startKm === '') return;
    triggerDriverHaptic([60, 40]);

    const clientEventId = generateUUID();
    const recordedAt = new Date().toISOString();

    const isOwner = Boolean(driverSession?.is_owner_driver ?? (driverSession?.username === 'senthilraja'));

    const newTrip: LocalTrip = {
      client_event_id: clientEventId,
      vehicle_id: 'BUS-14-23STR',
      customer_name: customerName,
      destination: destination,
      calendar_event_id: selectedSlotId || undefined,
      driver_username: driverSession?.username || 'senthilraja',
      is_owner_driver: isOwner,
      driver_bata_inr: 0,
      start_km: Number(startKm),
      cash_received_inr: 0,
      tolls_and_extras_inr: 0,
      status: 'IN_PROGRESS',
      start_time: recordedAt,
      created_at: recordedAt,
      synced: false,
    };

    // 1. Write to Dexie
    await db.trips.add(newTrip);

    // 2. Queue for background sync
    await syncEngine.queueEvent(
      'TRIP_START',
      clientEventId,
      {
        customer_name: customerName,
        destination: destination,
        start_km: Number(startKm),
        vehicle_id: 'BUS-14-23STR',
        calendar_event_id: selectedSlotId || undefined,
        driver_username: driverSession?.username || 'senthilraja',
        is_owner_driver: isOwner,
      },
      recordedAt
    );

    await loadLocalActiveTrip();
  };

  // Phase 2: Handle Native Mobile Camera Receipt Capture & Compression
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerDriverHaptic([40]);
    setIsCompressingImage(true);

    try {
      const compressed = await compressReceiptImage(file);
      setReceiptImage(compressed);
      triggerDriverHaptic([30, 30]);
    } catch (err) {
      console.error('Compression error:', err);
    } finally {
      setIsCompressingImage(false);
    }
  };

  // Phase 2: Submit Fuel Receipt Stop (100% Offline to Dexie)
  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || fuelAmount === '') return;
    triggerDriverHaptic([60, 40]);

    const clientEventId = generateUUID();
    const recordedAt = new Date().toISOString();

    const receiptRecord: LocalFuelReceipt = {
      client_event_id: clientEventId,
      trip_id: activeTrip.client_event_id,
      amount_inr: Number(fuelAmount),
      liters: fuelLiters !== '' ? Number(fuelLiters) : undefined,
      receipt_image_data: receiptImage?.base64,
      recorded_at: recordedAt,
      created_at: recordedAt,
      synced: false,
    };

    // 1. Write to Dexie
    await db.fuel_receipts.add(receiptRecord);

    // 2. Queue for background sync
    await syncEngine.queueEvent(
      'FUEL_LOG',
      clientEventId,
      {
        trip_id: activeTrip.client_event_id,
        amount_inr: Number(fuelAmount),
        liters: fuelLiters !== '' ? Number(fuelLiters) : undefined,
        receipt_image_base64: receiptImage?.base64,
      },
      recordedAt
    );

    // Reset form
    setFuelAmount('');
    setFuelLiters('');
    setReceiptImage(null);
    setFuelSuccessMsg(`Logged ₹${receiptRecord.amount_inr} diesel bill to binder`);
    setTimeout(() => setFuelSuccessMsg(''), 4000);

    // Refresh local receipts
    const updated = await db.fuel_receipts
      .where('trip_id')
      .equals(activeTrip.client_event_id)
      .toArray();
    setFuelReceipts(updated);
  };

  // Phase 3: Validate & Complete Trip (100% Offline to Dexie)
  const handleEndTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip || endKm === '') return;

    const numEndKm = Number(endKm);
    if (numEndKm <= activeTrip.start_km) {
      triggerDriverHaptic([100, 50, 100]);
      setEndKmError(t.endKmError(activeTrip.start_km));
      return;
    }
    setEndKmError(null);
    triggerDriverHaptic([80, 50, 80]);
    setIsCompletingTrip(true);

    const clientEventId = generateUUID();
    const recordedAt = new Date().toISOString();
    const totalKm = Math.round((numEndKm - activeTrip.start_km) * 100) / 100;

    const isOwner = Boolean(driverSession?.is_owner_driver ?? (driverSession?.username === 'senthilraja'));
    const effectiveBata = isOwner ? 0 : (driverBata !== '' ? Number(driverBata) : 0);

    const numToll = tollAmount !== '' ? Number(tollAmount) : 0;
    const numRto = rtoAmount !== '' ? Number(rtoAmount) : 0;
    const numParking = parkingAmount !== '' ? Number(parkingAmount) : 0;
    const numOther = otherExpenses !== '' ? Number(otherExpenses) : 0;
    const itemizedTotalRoadExpenses = Math.round((numToll + numRto + numParking + numOther) * 100) / 100;

    // 1. Update in Dexie
    await db.trips
      .where('client_event_id')
      .equals(activeTrip.client_event_id)
      .modify({
        end_km: numEndKm,
        total_km: totalKm,
        cash_received_inr: cashReceived !== '' ? Number(cashReceived) : 0,
        tolls_and_extras_inr: itemizedTotalRoadExpenses,
        toll_amount_inr: numToll,
        rto_amount_inr: numRto,
        parking_amount_inr: numParking,
        other_expenses_inr: numOther,
        driver_bata_inr: effectiveBata,
        driver_username: driverSession?.username || 'senthilraja',
        is_owner_driver: isOwner,
        status: 'COMPLETED',
        end_time: recordedAt,
        synced: false,
      });

    // 2. Queue for background sync
    await syncEngine.queueEvent(
      'TRIP_END',
      clientEventId,
      {
        trip_id: activeTrip.client_event_id,
        end_km: numEndKm,
        cash_received_inr: cashReceived !== '' ? Number(cashReceived) : 0,
        tolls_and_extras_inr: itemizedTotalRoadExpenses,
        toll_amount_inr: numToll,
        rto_amount_inr: numRto,
        parking_amount_inr: numParking,
        other_expenses_inr: numOther,
        driver_bata_inr: effectiveBata,
        driver_username: driverSession?.username || 'senthilraja',
        is_owner_driver: isOwner,
      },
      recordedAt
    );

    setIsCompletingTrip(false);
    await loadLocalActiveTrip();
  };

  // Date category helper for slots
  const categorizeSlotDate = (startTimeStr: string) => {
    const slotDate = new Date(startTimeStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const target = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());
    if (target.getTime() === today.getTime()) return t.todayLabel;
    if (target.getTime() === tomorrow.getTime()) return t.tomorrowLabel;
    return t.upcomingLabel;
  };

  if (!driverSession) {
    return (
      <DriverLogin
        onLoginSuccess={(session) => {
          setDriverSessionState(session);
        }}
      />
    );
  }

  const isOwner = Boolean(driverSession.is_owner_driver ?? (driverSession.username === 'senthilraja'));

  const handleDriverLogout = () => {
    triggerDriverHaptic([40]);
    api.clearDriverSession();
    setDriverSessionState(null);
  };

  return (
    <div className="flex flex-col">
      {/* 5-Day Upcoming Tour Notification Banner */}
      <AdvanceTourNotificationBanner />

      <div className="max-w-md mx-auto p-4 space-y-4 pb-20 w-full">
        {/* Driver Account & Quick Actions Bar */}
        <div className="cockpit-card p-3 bg-[#0F172A] border border-[#1E293B] flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isOwner ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {isOwner ? <Crown className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white truncate">{driverSession.full_name}</div>
              <div className={`text-[10px] font-semibold flex items-center space-x-1 ${
                isOwner ? 'text-[#10B981]' : 'text-blue-400'
              }`}>
                <span>{isOwner ? t.ownerDriverBadge : t.hiredDriverBadge}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              onClick={() => {
                triggerDriverHaptic([30]);
                setIsMonthCalendarOpen(true);
              }}
              className="p-1.5 rounded-lg bg-[#1E293B] text-slate-300 hover:text-white hover:bg-slate-700 transition flex items-center space-x-1"
              title={t.fullMonthCalendarTitle}
            >
              <CalendarDays className="w-4 h-4 text-[#10B981]" />
              <span className="hidden sm:inline text-[11px] font-bold">Tamil Cal</span>
            </button>
            <button
              onClick={handleDriverLogout}
              className="p-1.5 rounded-lg bg-red-950/40 text-red-400 hover:text-red-200 transition"
              title={t.driverLogoutBtn}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Vehicle Telemetry & Duty Banner */}
        <div className="cockpit-card p-4 border-[#10B981]/30 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          <div className="flex items-center justify-between border-b border-[#1E293B] pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] pulse-dot" />
              <span className="text-xs font-bold text-[#10B981] tracking-wider uppercase font-mono">
                SHIFT ACTIVE • TN37aw6052
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400">23-Seater Executive</span>
          </div>

        {activeTrip ? (
          <div>
            <div className="text-xs uppercase font-mono text-slate-400 tracking-wider">{t.activeTripLabel}</div>
            <h2 className="text-lg font-bold text-white tracking-tight">{activeTrip.customer_name}</h2>
            <div className="flex items-center space-x-2 text-xs text-[#10B981] mt-1 font-medium">
              <MapPin className="w-3.5 h-3.5" />
              <span>{activeTrip.destination}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#1E293B]/80 text-center font-mono">
              <div className="p-2 rounded-lg bg-[#090D16]">
                <div className="text-[10px] text-slate-400 uppercase">Start Odo</div>
                <div className="text-sm font-bold text-white">{activeTrip.start_km.toLocaleString()} KM</div>
              </div>
              <div className="p-2 rounded-lg bg-[#090D16]">
                <div className="text-[10px] text-slate-400 uppercase">Diesel Bills</div>
                <div className="text-sm font-bold text-[#F59E0B]">{fuelReceipts.length} Logged</div>
              </div>
              <div className="p-2 rounded-lg bg-[#090D16]">
                <div className="text-[10px] text-slate-400 uppercase">Fuel Total</div>
                <div className="text-sm font-bold text-white">
                  ₹{fuelReceipts.reduce((sum, r) => sum + r.amount_inr, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-2 text-center">
            <div className="inline-flex p-2 rounded-full bg-[#1E293B] text-slate-300 mb-2">
              <Navigation className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-white">No Active Trip in Progress</h3>
            <p className="text-xs text-slate-400 mt-1">{t.startTripSubheading}</p>
          </div>
        )}
      </div>

      {/* 3-PHASE DRIVER WORKFLOW ACCORDIONS */}
      <div className="space-y-3">
        {/* PHASE 1: START TRIP & SLOT PICKER */}
        <div className={`cockpit-card overflow-hidden transition ${activeWorkflowStep === 1 ? 'border-[#10B981]' : 'border-[#1E293B]'}`}>
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveWorkflowStep(1);
            }}
            className="w-full min-h-[58px] px-4 flex items-center justify-between text-left bg-[#0F172A] hover:bg-[#152033]"
          >
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm font-mono ${activeTrip ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#1E293B] text-white'}`}>
                {activeTrip ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <div>
                <div className="text-sm font-bold text-white">{t.tabTripStart}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {activeTrip ? `${activeTrip.customer_name} (${activeTrip.start_km} KM)` : t.stepIndicator(1, 3)}
                </div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transform transition ${activeWorkflowStep === 1 ? 'rotate-90' : ''}`} />
          </button>

          {activeWorkflowStep === 1 && (
            <div className="p-4 border-t border-[#1E293B] space-y-4 bg-[#0A0E17]/60">
              {activeTrip ? (
                <div className="p-3 rounded-xl bg-[#1E293B]/50 text-center">
                  <div className="text-xs text-[#10B981] font-semibold flex items-center justify-center space-x-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.activeTripWarning}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* CALENDAR TRIP SLOTS PICKER */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-[#10B981]" />
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          {t.tripSchedule}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleManualTrip}
                        className="text-[11px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded-md bg-[#1E293B] border border-[#334155] transition"
                      >
                        {t.manualTripBtn}
                      </button>
                    </div>

                    {calendarSlots.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B] text-center text-xs text-slate-400 font-mono">
                        {t.noSlotsFound}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {calendarSlots.map((slot) => {
                          const isSelected = selectedSlotId === slot.id;
                          const dateCategory = categorizeSlotDate(slot.start_time);
                          const isConfirmed = slot.status === 'confirmed';
                          const isPending = slot.status === 'pending';
                          const isMaint = slot.status === 'maintenance';

                          return (
                            <div
                              key={slot.id}
                              onClick={() => handleSelectSlot(slot)}
                              className={`p-3 rounded-xl border transition cursor-pointer select-none ${
                                isSelected
                                  ? 'bg-[#10B981]/15 border-[#10B981] shadow-lg shadow-emerald-950/40 ring-1 ring-[#10B981]'
                                  : 'bg-[#0F172A] border-[#1E293B] hover:border-[#334155]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E293B] text-slate-300 font-mono">
                                    {dateCategory}
                                  </span>
                                  {isConfirmed && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-mono">
                                      🟢 {t.slotConfirmed}
                                    </span>
                                  )}
                                  {isPending && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] font-mono">
                                      🟡 {t.slotPending}
                                    </span>
                                  )}
                                  {isMaint && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444] font-mono">
                                      🔴 {t.slotMaintenance}
                                    </span>
                                  )}
                                </div>

                                {isSelected && (
                                  <span className="text-[10px] font-bold text-[#10B981] flex items-center space-x-1">
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{t.selectedSlotBadge}</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-sm font-bold text-white tracking-tight">{slot.customer_name}</div>
                              {slot.destination && (
                                <div className="text-xs text-slate-300 flex items-center space-x-1.5 mt-0.5">
                                  <MapPin className="w-3 h-3 text-[#10B981]" />
                                  <span>{slot.destination}</span>
                                </div>
                              )}

                              <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono mt-2">
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>
                                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </span>
                                {slot.phone && (
                                  <span className="flex items-center space-x-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{slot.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* START TRIP FORM WITH VOICE INPUT FIELDS */}
                  <form onSubmit={handleStartTrip} className="space-y-3 pt-2 border-t border-[#1E293B]">
                    {selectedSlotId && (
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981]">
                        <span>✓ {t.selectedSlotBadge}: #{selectedSlotId.slice(-8)}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSlotId(null)}
                          className="hover:text-white p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <VoiceInputField
                      label={t.customerNameLabel}
                      icon="👤"
                      value={customerName}
                      onChange={setCustomerName}
                      placeholder={t.customerNamePlaceholder}
                      required
                    />

                    <VoiceInputField
                      label={t.destinationLabel}
                      icon="📍"
                      value={destination}
                      onChange={setDestination}
                      placeholder={t.destinationPlaceholder}
                      required
                    />

                    <VoiceInputField
                      label={t.startKmLabel}
                      icon="⏱️"
                      value={startKm}
                      onChange={setStartKm}
                      type="number"
                      placeholder={t.startKmPlaceholder}
                      helpText={t.startKmHelp}
                      required
                      fontMono
                    />

                    <button
                      type="submit"
                      className="cockpit-btn-primary w-full min-h-[58px] text-base tracking-wide flex items-center justify-center space-x-2"
                    >
                      <span>🚀</span>
                      <span>{t.startTripBtn}</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>

        {/* PHASE 2: FUEL STOP (DIGITAL BILL BINDER) */}
        <div className={`cockpit-card overflow-hidden transition ${activeWorkflowStep === 2 ? 'border-[#F59E0B]' : 'border-[#1E293B]'}`}>
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveWorkflowStep(2);
            }}
            className="w-full min-h-[58px] px-4 flex items-center justify-between text-left bg-[#0F172A] hover:bg-[#152033]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/20 text-[#F59E0B] flex items-center justify-center font-bold text-sm font-mono">
                2
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>{t.tabFuelStop}</span>
                  {fuelReceipts.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#F59E0B] text-[#090D16] font-mono font-bold">
                      {fuelReceipts.length}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{t.fuelStopSubheading}</div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transform transition ${activeWorkflowStep === 2 ? 'rotate-90' : ''}`} />
          </button>

          {activeWorkflowStep === 2 && (
            <div className="p-4 border-t border-[#1E293B] space-y-4 bg-[#0A0E17]/60">
              {!activeTrip ? (
                <div className="p-3 text-center text-xs text-amber-400/90 font-mono">
                  {t.activeTripWarning}
                </div>
              ) : (
                <form onSubmit={handleLogFuel} className="space-y-3">
                  {fuelSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-[#10B981]/20 border border-[#10B981] text-xs font-semibold text-[#10B981] text-center flex items-center justify-center space-x-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>{fuelSuccessMsg}</span>
                    </div>
                  )}

                  {/* Native Camera Capture Button */}
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-1.5">
                      {t.fuelBillPhotoLabel}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />

                    {receiptImage ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-[#10B981] bg-[#090D16] p-2">
                        <img
                          src={receiptImage.base64}
                          alt="Diesel receipt preview"
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <div className="mt-2 flex items-center justify-between text-xs font-mono px-1">
                          <span className="text-[#10B981] font-bold">
                            ✓ {t.billCaptured} ({receiptImage.sizeKb} KB)
                          </span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-amber-400 underline font-semibold"
                          >
                            {t.retakeBill}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          triggerDriverHaptic([40]);
                          fileInputRef.current?.click();
                        }}
                        disabled={isCompressingImage}
                        className="w-full min-h-[64px] rounded-xl border-2 border-dashed border-[#F59E0B]/60 hover:border-[#F59E0B] bg-[#0F172A] hover:bg-[#1E293B] flex items-center justify-center space-x-2 text-white font-bold transition active:scale-98"
                      >
                        <Camera className="w-6 h-6 text-[#F59E0B]" />
                        <span>{isCompressingImage ? t.compressingImage : `📸 ${t.tapToCaptureBill}`}</span>
                      </button>
                    )}
                  </div>

                  {/* Voice Input for Fuel Amount & Liters */}
                  <VoiceInputField
                    label={t.fuelAmountLabel}
                    icon="⛽"
                    value={fuelAmount}
                    onChange={setFuelAmount}
                    type="number"
                    placeholder={t.fuelAmountPlaceholder}
                    quickAddChips={[500, 1000, 2000, 3000, 5000]}
                    required
                    fontMono
                  />

                  <VoiceInputField
                    label={t.fuelLitersLabel}
                    icon="🛢️"
                    value={fuelLiters}
                    onChange={setFuelLiters}
                    type="number"
                    step="0.01"
                    placeholder={t.fuelLitersPlaceholder}
                    quickAddChips={[20, 30, 40, 50, 60]}
                    fontMono
                  />

                  <button
                    type="submit"
                    className="cockpit-btn-secondary w-full min-h-[56px] text-base font-bold bg-[#F59E0B] hover:bg-[#D97706] text-[#090D16] border-none"
                  >
                    + {t.logFuelBtn}
                  </button>

                  {/* List of receipts already in binder for this trip */}
                  {fuelReceipts.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#1E293B]">
                      <div className="text-xs font-mono uppercase text-slate-400 mb-2">
                        {t.loggedReceiptsTitle} ({fuelReceipts.length})
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {fuelReceipts.map((r) => (
                          <div
                            key={r.client_event_id}
                            className="flex items-center justify-between p-2 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs font-mono"
                          >
                            <div className="flex items-center space-x-2">
                              <Receipt className="w-4 h-4 text-[#F59E0B]" />
                              <span className="text-white font-bold">₹{r.amount_inr.toLocaleString()}</span>
                              {r.liters && <span className="text-slate-400">({r.liters} L)</span>}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>

        {/* PHASE 3: END TRIP & CASH SETTLEMENT */}
        <div className={`cockpit-card overflow-hidden transition ${activeWorkflowStep === 3 ? 'border-[#10B981]' : 'border-[#1E293B]'}`}>
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveWorkflowStep(3);
            }}
            className="w-full min-h-[58px] px-4 flex items-center justify-between text-left bg-[#0F172A] hover:bg-[#152033]"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/20 text-[#10B981] flex items-center justify-center font-bold text-sm font-mono">
                3
              </div>
              <div>
                <div className="text-sm font-bold text-white">{t.tabTripEnd}</div>
                <div className="text-[11px] text-slate-400 font-mono">{t.finishTripSubheading}</div>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 text-slate-400 transform transition ${activeWorkflowStep === 3 ? 'rotate-90' : ''}`} />
          </button>

          {activeWorkflowStep === 3 && (
            <div className="p-4 border-t border-[#1E293B] space-y-3 bg-[#0A0E17]/60">
              {!activeTrip ? (
                <div className="p-3 text-center text-xs text-slate-400 font-mono">
                  {t.noSlotsFound}
                </div>
              ) : (
                <form onSubmit={handleEndTrip} className="space-y-3">
                  {endKmError && (
                    <div className="p-3 rounded-lg bg-red-900/30 border border-red-500 text-xs font-semibold text-red-200 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{endKmError}</span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-lg bg-[#0F172A] border border-[#1E293B] text-xs font-mono flex items-center justify-between">
                    <span className="text-slate-400">{t.startKmLabel}:</span>
                    <span className="text-[#10B981] font-bold text-sm">{activeTrip.start_km.toLocaleString()} KM</span>
                  </div>

                  <VoiceInputField
                    label={t.endKmLabel}
                    icon="⏱️"
                    value={endKm}
                    onChange={(val) => {
                      setEndKm(val);
                      setEndKmError(null);
                    }}
                    type="number"
                    min={activeTrip.start_km + 1}
                    placeholder={t.endKmPlaceholder}
                    helpText={t.endKmHelp(activeTrip.start_km)}
                    error={endKmError}
                    required
                    fontMono
                  />

                  {endKm !== '' && Number(endKm) > activeTrip.start_km && (
                    <div className="p-2.5 rounded-lg bg-[#090D16] border border-[#1E293B] text-xs font-mono text-[#10B981] flex items-center justify-between">
                      <span className="flex items-center space-x-1 font-bold">
                        <span>🛣️</span>
                        <span>{t.totalDistance}:</span>
                      </span>
                      <span className="font-extrabold text-base">{(Number(endKm) - activeTrip.start_km).toFixed(1)} KM</span>
                    </div>
                  )}

                  <VoiceInputField
                    label={t.cashReceivedLabel}
                    icon="💵"
                    value={cashReceived}
                    onChange={setCashReceived}
                    type="number"
                    placeholder={t.cashReceivedPlaceholder}
                    quickAddChips={[1000, 2000, 5000, 10000]}
                    required
                    fontMono
                  />

                  {/* Itemized Road Expenses: Toll, RTO, Parking, Other Expenses */}
                  <div className="space-y-3 pt-3 pb-2 border-t border-[#1E293B]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold uppercase text-slate-300">
                        {t.roadExpensesBreakdown}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#F59E0B] px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                        {t.totalRoadExpensesLabel}: ₹{totalRoadExpenses.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Toll Charges */}
                      <VoiceInputField
                        label={t.tollBoxLabel}
                        icon="🛑"
                        value={tollAmount}
                        onChange={setTollAmount}
                        type="number"
                        placeholder="0"
                        quickAddChips={[50, 100, 150, 200, 500]}
                        fontMono
                      />

                      {/* 2. RTO Permit Charges */}
                      <VoiceInputField
                        label={t.rtoBoxLabel}
                        icon="🏛️"
                        value={rtoAmount}
                        onChange={setRtoAmount}
                        type="number"
                        placeholder="0"
                        quickAddChips={[100, 200, 300, 500, 1000]}
                        fontMono
                      />

                      {/* 3. Parking Fees */}
                      <VoiceInputField
                        label={t.parkingBoxLabel}
                        icon="🅿️"
                        value={parkingAmount}
                        onChange={setParkingAmount}
                        type="number"
                        placeholder="0"
                        quickAddChips={[50, 100, 150, 200]}
                        fontMono
                      />

                      {/* 4. Other Expenses */}
                      <VoiceInputField
                        label={t.otherExpensesBoxLabel}
                        icon="🧾"
                        value={otherExpenses}
                        onChange={setOtherExpenses}
                        type="number"
                        placeholder="0"
                        quickAddChips={[50, 100, 200, 500]}
                        fontMono
                      />
                    </div>
                  </div>

                  {/* Owner-Driver Bata Rule: Locked to ₹0 for senthilraja, editable for hired drivers */}
                  {isOwner ? (
                    <div className="p-3 rounded-lg bg-emerald-950/40 border border-[#10B981]/50 text-xs font-mono text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Crown className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                        <span>{t.driverBataOwnerZero}</span>
                      </div>
                      <span className="font-bold text-sm text-[#10B981]">₹0</span>
                    </div>
                  ) : (
                    <VoiceInputField
                      label={t.driverBataLabel}
                      value={driverBata}
                      onChange={setDriverBata}
                      type="number"
                      placeholder={t.driverBataPlaceholder}
                      fontMono
                    />
                  )}

                  <button
                    type="submit"
                    disabled={isCompletingTrip}
                    className="cockpit-btn-primary w-full min-h-[58px] text-base tracking-wide flex items-center justify-center space-x-2"
                  >
                    <span>🏁</span>
                    <span>{isCompletingTrip ? t.finishing : t.finishTripBtn}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Interactive Full Monthly Tamil Calendar Modal */}
      {isMonthCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col">
            <FullMonthCalendar isModal onClose={() => setIsMonthCalendarOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
