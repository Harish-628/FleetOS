import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Receipt,
  ShieldCheck,
  Calendar as CalendarIcon,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  IndianRupee,
  Fuel,
  Maximize2,
  X,
  FileText,
  LogOut,
  Users,
  Crown,
  Plus,
} from 'lucide-react';
import {
  api,
  setOnAuthError,
  type TripApiItem,
  type FuelReceiptApiItem,
  type ComplianceApiResponse,
  type DriverApiItem,
} from '../../lib/api';
import { formatINR, formatDate, formatDateTime, triggerDriverHaptic } from '../../lib/formatters';
import { AdminLogin } from './AdminLogin';
import { FullMonthCalendar } from '../../components/FullMonthCalendar';
import { AdvanceTourNotificationBanner } from '../../components/AdvanceTourNotificationBanner';

export const AdminPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(api.getAdminToken()));
  const [activeTab, setActiveTab] = useState<'pnl' | 'vault' | 'compliance' | 'calendar' | 'drivers'>('pnl');

  // Data states
  const [trips, setTrips] = useState<TripApiItem[]>([]);
  const [receipts, setFuelReceipts] = useState<FuelReceiptApiItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceApiResponse | null>(null);
  const [drivers, setDrivers] = useState<DriverApiItem[]>([]);

  // Driver creation modal
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [newDriverUname, setNewDriverUname] = useState('');
  const [newDriverPass, setNewDriverPass] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverIsOwner, setNewDriverIsOwner] = useState(false);
  const [driverCreateError, setDriverCreateError] = useState<string | null>(null);
  const [isCreatingDriver, setIsCreatingDriver] = useState(false);

  // Filters for P&L Ledger
  const [searchCustomer, setSearchCustomer] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Lightbox for Receipt Vault
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  // Load all admin data
  const loadAdminData = async () => {
    try {
      const [tripsData, fuelData, compData, driversData] = await Promise.all([
        api.getTrips(),
        api.getFuelReceipts(),
        api.getCompliance(),
        api.getDrivers().catch(() => []),
      ]);
      setTrips(tripsData);
      setFuelReceipts(fuelData);
      setCompliance(compData);
      setDrivers(driversData);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverUname.trim() || !newDriverPass.trim() || !newDriverName.trim()) {
      setDriverCreateError('All fields are required');
      return;
    }
    setIsCreatingDriver(true);
    setDriverCreateError(null);
    try {
      const created = await api.createDriver({
        username: newDriverUname.trim().toLowerCase(),
        password: newDriverPass.trim(),
        full_name: newDriverName.trim(),
        is_owner_driver: newDriverIsOwner,
      });
      setDrivers((prev) => [...prev, created]);
      setIsDriverModalOpen(false);
      setNewDriverUname('');
      setNewDriverPass('');
      setNewDriverName('');
      setNewDriverIsOwner(false);
    } catch (err: any) {
      setDriverCreateError(err.message || 'Failed to create driver account');
    } finally {
      setIsCreatingDriver(false);
    }
  };

  useEffect(() => {
    setOnAuthError(() => setIsAuthenticated(false));
    if (api.getAdminToken()) {
      loadAdminData();
    }
  }, []);

  const handleLogout = () => {
    triggerDriverHaptic([40]);
    api.clearAdminToken();
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAuthenticated(true);
          loadAdminData();
        }}
      />
    );
  }

  // Filtered trips for P&L ledger
  const filteredTrips = trips.filter((t) => {
    const matchesSearch = t.customer_name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchCustomer.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Fleet summary KPIs
  const totalRevenue = trips.reduce((sum, t) => sum + (t.cash_received_inr || 0), 0);
  const totalFuelCost = trips.reduce((sum, t) => sum + (t.total_fuel_amount_inr || 0), 0);
  const totalNetProfit = trips.reduce((sum, t) => sum + (t.net_profit_inr || 0), 0);
  const totalKmRun = trips.reduce((sum, t) => sum + (t.total_km || 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* 5-Day Advance Tour Notification Banner */}
      <AdvanceTourNotificationBanner />

      {/* Fleet Executive Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="cockpit-card p-4 border-[#10B981]/40 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {formatINR(totalRevenue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all trips logged</div>
        </div>

        <div className="cockpit-card p-4 border-[#F59E0B]/40 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Diesel Fuel Cost</span>
            <Fuel className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#F59E0B] mt-1">
            {formatINR(totalFuelCost)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified via receipt vault</div>
        </div>

        <div className="cockpit-card p-4 border-[#10B981]/50 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Net Fleet Profit</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#10B981] mt-1">
            {formatINR(totalNetProfit)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-semibold">
            {totalRevenue > 0 ? `${((totalNetProfit / totalRevenue) * 100).toFixed(1)}% margin` : '---'}
          </div>
        </div>

        <div className="cockpit-card p-4 border-slate-700 bg-gradient-to-br from-[#0F172A] to-[#0A0E17]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-400">
            <span>Total Fleet Distance</span>
            <MapPin className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            {totalKmRun.toLocaleString()} KM
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Vinoth Travels • TN37aw6052 (23-Seater)</div>
        </div>
      </div>

      {/* Admin Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#1E293B] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'pnl'
              ? 'bg-[#10B981] text-[#090D16]'
              : 'bg-[#0F172A] border border-[#1E293B] text-slate-300 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Trip P&L Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('vault')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'vault'
              ? 'bg-[#10B981] text-[#090D16]'
              : 'bg-[#0F172A] border border-[#1E293B] text-slate-300 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Digital Receipt Vault ({receipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'compliance'
              ? 'bg-[#10B981] text-[#090D16]'
              : 'bg-[#0F172A] border border-[#1E293B] text-slate-300 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Compliance Countdown</span>
          {compliance?.requires_attention && (
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'calendar'
              ? 'bg-[#10B981] text-[#090D16]'
              : 'bg-[#0F172A] border border-[#1E293B] text-slate-300 hover:text-white'
          }`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span>Fleet Booking Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('drivers')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'drivers'
              ? 'bg-[#10B981] text-[#090D16]'
              : 'bg-[#0F172A] border border-[#1E293B] text-slate-300 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Driver Accounts ({drivers.length})</span>
        </button>

        <div className="flex-1"></div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#1E293B] text-slate-300 hover:text-red-400 hover:bg-[#334155] border border-[#334155] transition"
          title="Sign out of Admin session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATED TRIP P&L LEDGER */}
      {activeTab === 'pnl' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0F172A] p-3 rounded-xl border border-[#1E293B]">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or route..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="cockpit-input w-full pl-9 text-sm"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <span className="text-xs font-mono text-slate-400 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="cockpit-input text-xs py-2 h-10"
              >
                <option value="ALL">All Trips ({trips.length})</option>
                <option value="IN_PROGRESS">In-Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="cockpit-card overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#0A0E17] border-b border-[#1E293B] text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Customer / Booking</th>
                  <th className="p-3">Driver</th>
                  <th className="p-3">Route</th>
                  <th className="p-3 text-right">Start KM</th>
                  <th className="p-3 text-right">End KM</th>
                  <th className="p-3 text-right">Total KM</th>
                  <th className="p-3 text-right">Fuel (₹)</th>
                  <th className="p-3 text-right">Mileage (KM/L)</th>
                  <th className="p-3 text-right">Tolls/Extras (₹)</th>
                  <th className="p-3 text-right">Driver Bata (₹)</th>
                  <th className="p-3 text-right">Revenue (₹)</th>
                  <th className="p-3 text-right text-emerald-400">Net Profit (₹)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-slate-400 font-sans">
                      No trip records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-[#1E293B]/30 transition">
                      <td className="p-3 font-sans font-bold text-white">
                        {trip.customer_name}
                        <div className="text-[11px] text-slate-400 font-mono font-normal">
                          {formatDateTime(trip.start_time)}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        {trip.driver_username ? (
                          trip.driver_username === 'senthilraja' ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold inline-flex items-center space-x-1">
                              <Crown className="w-2.5 h-2.5" />
                              <span>{trip.driver_username}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">{trip.driver_username}</span>
                          )
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-bold inline-flex items-center space-x-1">
                            <Crown className="w-2.5 h-2.5" />
                            <span>senthilraja</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-300 font-sans">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#10B981]" />
                          <span>{trip.destination}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right text-slate-300">{trip.start_km.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-300">
                        {trip.end_km ? trip.end_km.toLocaleString() : '---'}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        {trip.total_km ? `${trip.total_km.toFixed(1)} KM` : '---'}
                      </td>
                      <td className="p-3 text-right text-[#F59E0B]">
                        ₹{(trip.total_fuel_amount_inr || 0).toLocaleString()}
                        {trip.total_fuel_liters > 0 && (
                          <div className="text-[10px] text-slate-400">({trip.total_fuel_liters} L)</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-cyan-400">
                        {trip.mileage_kmpl ? `${trip.mileage_kmpl} KM/L` : '---'}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        <div className="font-semibold text-slate-200">
                          ₹{(trip.tolls_and_extras_inr || 0).toLocaleString()}
                        </div>
                        {(Boolean(trip.toll_amount_inr) || Boolean(trip.rto_amount_inr) || Boolean(trip.parking_amount_inr) || Boolean(trip.other_expenses_inr)) && (
                          <div className="text-[10px] text-slate-400 font-mono space-y-0.5 mt-0.5">
                            {Boolean(trip.toll_amount_inr) && <div>Toll: ₹{trip.toll_amount_inr?.toLocaleString()}</div>}
                            {Boolean(trip.rto_amount_inr) && <div>RTO: ₹{trip.rto_amount_inr?.toLocaleString()}</div>}
                            {Boolean(trip.parking_amount_inr) && <div>Park: ₹{trip.parking_amount_inr?.toLocaleString()}</div>}
                            {Boolean(trip.other_expenses_inr) && <div>Other: ₹{trip.other_expenses_inr?.toLocaleString()}</div>}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {trip.driver_username === 'senthilraja' || !trip.driver_username || trip.driver_bata_inr === 0 ? (
                          <span className="text-emerald-400 font-bold" title="Owner-driver: zero bata enforced">₹0 (Owner)</span>
                        ) : (
                          <span className="text-amber-400">₹{(trip.driver_bata_inr || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        ₹{(trip.cash_received_inr || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-sm text-[#10B981]">
                        ₹{(trip.net_profit_inr || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            trip.status === 'COMPLETED'
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                              : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/40'
                          }`}
                        >
                          {trip.status === 'COMPLETED' ? 'Completed' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL RECEIPT VAULT */}
      {activeTab === 'vault' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-[#0F172A] border border-[#1E293B] text-xs text-slate-300 font-sans flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-[#F59E0B]" />
              <span>
                All diesel receipt photos are automatically compressed (&lt;= 250 KB) client-side before sync and stored in high resolution.
              </span>
            </div>
            <span className="font-mono font-bold text-white">{receipts.length} Invoices Vaulted</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {receipts.length === 0 ? (
              <div className="col-span-full cockpit-card p-12 text-center text-slate-400 font-sans">
                No diesel receipts uploaded yet. Log a fuel stop via the Driver Mobile PWA to test.
              </div>
            ) : (
              receipts.map((r) => (
                <div
                  key={r.id}
                  className="cockpit-card overflow-hidden hover:border-[#F59E0B]/60 transition flex flex-col justify-between"
                >
                  <div className="relative bg-[#090D16] h-48 flex items-center justify-center overflow-hidden">
                    {r.receipt_image_url ? (
                      <img
                        src={r.receipt_image_url}
                        alt="Fuel bill"
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                        onClick={() => setSelectedReceiptUrl(r.receipt_image_url || null)}
                      />
                    ) : (
                      <div className="text-center p-4">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <span className="text-xs font-mono text-slate-500">Digital Bill Record</span>
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedReceiptUrl(r.receipt_image_url || '/uploads/sample_diesel_bill.webp')}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white"
                      title="Inspect Invoice Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-sm font-bold text-[#F59E0B]">₹{r.amount_inr.toLocaleString()}</span>
                      {r.liters && <span className="text-xs text-slate-300 font-semibold">{r.liters} Liters</span>}
                    </div>

                    <div className="text-xs font-sans font-bold text-white truncate">
                      {r.customer_name || 'Commercial Route Trip'}
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-[#1E293B]">
                      <span>Logged:</span>
                      <span>{formatDate(r.recorded_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLIANCE COUNTDOWN BOARD */}
      {activeTab === 'compliance' && compliance && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {compliance.items.map((item) => {
              const isGreen = item.status === 'GREEN';
              const isAmber = item.status === 'AMBER';
              const isRed = item.status === 'RED';

              return (
                <div
                  key={item.code}
                  className={`cockpit-card p-5 border-2 transition ${
                    isGreen
                      ? 'border-[#10B981]/50 bg-[#10B981]/5'
                      : isAmber
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'border-red-500 bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      {item.code}
                    </span>
                    {isGreen && <CheckCircle2 className="w-5 h-5 text-[#10B981]" />}
                    {isAmber && <AlertTriangle className="w-5 h-5 text-[#F59E0B] animate-pulse" />}
                    {isRed && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>

                  <h3 className="text-base font-bold text-white mt-2 font-sans">{item.name}</h3>

                  <div className="mt-4 pt-4 border-t border-[#1E293B]">
                    <div className="text-3xl font-extrabold font-mono text-white">
                      {item.days_remaining > 0 ? item.days_remaining : 0}
                      <span className="text-xs font-normal text-slate-400 ml-1">days left</span>
                    </div>

                    <div
                      className={`mt-2 text-xs font-bold font-mono px-2.5 py-1 rounded-md inline-block ${
                        isGreen
                          ? 'bg-[#10B981]/20 text-[#10B981]'
                          : isAmber
                          ? 'bg-[#F59E0B]/20 text-[#F59E0B]'
                          : 'bg-red-900/40 text-red-300'
                      }`}
                    >
                      {item.status_label}
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 mt-3">
                      Expires: {formatDate(item.expiry_date)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-xl bg-[#0F172A] border border-[#1E293B] flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">RTO Commercial Vehicle Regulatory Status:</span>
            <span className="text-[#10B981] font-bold">Commercial Passenger Transport Approved (23 Seats)</span>
          </div>
        </div>
      )}

      {/* TAB 4: CENTRALIZED FLEET BOOKING CALENDAR WITH TAMIL CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <FullMonthCalendar isModal={false} />
        </div>
      )}

      {/* TAB 5: DRIVER ACCOUNTS & BATA POLICIES */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0F172A] border border-[#1E293B]">
            <div>
              <h2 className="text-base font-bold text-white font-sans flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#10B981]" />
                <span>Driver Fleet Authentication & Bata Policies</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Owner-driver (<code className="text-emerald-400 font-mono">senthilraja</code>) is permanently configured with <strong className="text-emerald-400">₹0 Driver Bata</strong> in all P&L computations. Hired drivers receive customizable daily Bata tracked under trip expenses.
              </p>
            </div>
            <button
              onClick={() => {
                triggerDriverHaptic([40]);
                setIsDriverModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-bold text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Driver</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.map((drv) => (
              <div
                key={drv.id}
                className={`cockpit-card p-5 border ${
                  drv.is_owner_driver
                    ? 'border-[#10B981]/60 bg-gradient-to-br from-[#0F172A] to-[#062419]'
                    : 'border-[#1E293B] bg-[#0F172A]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {drv.is_owner_driver ? (
                      <span className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                        <Crown className="w-5 h-5" />
                      </span>
                    ) : (
                      <span className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                        <Users className="w-5 h-5" />
                      </span>
                    )}
                    <div>
                      <div className="text-base font-bold text-white font-sans">{drv.full_name}</div>
                      <div className="text-xs font-mono text-slate-400">@{drv.username}</div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      drv.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                    }`}
                  >
                    {drv.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E293B] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Role:</span>
                    <span className="text-white font-semibold">
                      {drv.is_owner_driver ? '👑 Fleet Owner-Driver' : 'Commercial Hired Driver'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Bata Policy:</span>
                    <span className={drv.is_owner_driver ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'}>
                      {drv.is_owner_driver ? '₹0 / Trip (Enforced)' : 'Custom Per Trip'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                    <span>Registered:</span>
                    <span>{formatDate(drv.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal to Register New Driver */}
          {isDriverModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="relative max-w-md w-full bg-[#0F172A] border border-[#1E293B] rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-[#10B981]" />
                    <h3 className="font-bold text-white text-base font-sans">Register New Driver Account</h3>
                  </div>
                  <button
                    onClick={() => setIsDriverModalOpen(false)}
                    className="p-1 rounded-lg bg-[#1E293B] text-slate-300 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {driverCreateError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-200">
                    {driverCreateError}
                  </div>
                )}

                <form onSubmit={handleCreateDriver} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. R. Murugan"
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      className="cockpit-input w-full text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. murugan"
                      value={newDriverUname}
                      onChange={(e) => setNewDriverUname(e.target.value)}
                      className="cockpit-input w-full text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newDriverPass}
                      onChange={(e) => setNewDriverPass(e.target.value)}
                      className="cockpit-input w-full text-sm font-mono"
                    />
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#090D16] border border-[#1E293B]">
                    <input
                      type="checkbox"
                      id="isOwnerDriver"
                      checked={newDriverIsOwner}
                      onChange={(e) => setNewDriverIsOwner(e.target.checked)}
                      className="w-4 h-4 rounded text-[#10B981] bg-[#1E293B] border-slate-700 focus:ring-0"
                    />
                    <label htmlFor="isOwnerDriver" className="text-xs text-slate-300 select-none cursor-pointer">
                      <strong className="text-white block font-sans">Owner-Driver Account</strong>
                      <span className="text-[11px] text-slate-400 block font-sans">
                        If checked, driver bata will be locked to ₹0 and deducted from expenses.
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsDriverModalOpen(false)}
                      className="w-1/2 py-2.5 rounded-xl border border-[#1E293B] text-slate-300 hover:bg-[#1E293B] text-xs font-bold font-mono transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingDriver}
                      className="w-1/2 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#090D16] text-xs font-bold font-mono transition disabled:opacity-50"
                    >
                      {isCreatingDriver ? 'Creating...' : 'Create Driver'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RECEIPT LIGHTBOX MODAL */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-[#0F172A] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1E293B]">
              <span className="font-bold text-white font-mono text-sm">Diesel Receipt High-Res Audit</span>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-1 rounded-lg bg-[#1E293B] text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-[#090D16] flex items-center justify-center min-h-[300px]">
              <img
                src={selectedReceiptUrl}
                alt="Fuel invoice"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
