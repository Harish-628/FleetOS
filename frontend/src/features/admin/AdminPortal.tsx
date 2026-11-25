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
    <div className="flex flex-col min-h-dvh">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-5 pb-28 md:pb-8 w-full">
        {/* 5-Day Advance Tour Notification Banner */}
        <AdvanceTourNotificationBanner />

        {/* Fleet Executive Summary Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-500 dark:text-zinc-400">
              <span>Total Revenue</span>
              <IndianRupee className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 dark:text-zinc-50 mt-1 tabular-nums">
              {formatINR(totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Across all trips logged</div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-500 dark:text-zinc-400">
              <span>Diesel Fuel Cost</span>
              <Fuel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
              {formatINR(totalFuelCost)}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">Verified via receipt vault</div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-500 dark:text-zinc-400">
              <span>Net Fleet Profit</span>
              <TrendingUp className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
              {formatINR(totalNetProfit)}
            </div>
            <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-1 font-semibold tabular-nums">
              {totalRevenue > 0 ? `${((totalNetProfit / totalRevenue) * 100).toFixed(1)}% margin` : '---'}
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xs">
            <div className="flex items-center justify-between text-xs font-mono uppercase text-slate-500 dark:text-zinc-400">
              <span>Fleet Distance</span>
              <MapPin className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-slate-900 dark:text-zinc-50 mt-1 tabular-nums">
              {totalKmRun.toLocaleString()} KM
            </div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">TN37AW6052 • 23-Seater</div>
          </div>
        </div>

        {/* Desktop Admin Tabs Navigation (hidden on mobile, uses bottom nav) */}
        <div className="hidden md:flex items-center space-x-2 border-b border-slate-200 dark:border-zinc-800 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition ${
              activeTab === 'pnl'
                ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Trip P&L Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition ${
              activeTab === 'vault'
                ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Digital Receipt Vault ({receipts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition ${
              activeTab === 'compliance'
                ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Compliance Countdown</span>
            {compliance?.requires_attention && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition ${
              activeTab === 'calendar'
                ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Fleet Booking Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab('drivers')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-md font-semibold text-xs transition ${
              activeTab === 'drivers'
                ? 'bg-teal-700 text-white dark:bg-teal-600 shadow-xs'
                : 'bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Driver Accounts ({drivers.length})</span>
          </button>

          <div className="flex-1"></div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition"
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer or route..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-base md:text-xs font-mono text-slate-900 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-start">
                <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="p-2 text-base md:text-xs font-mono text-slate-900 dark:text-zinc-100 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md focus:outline-none focus:border-teal-600 dark:focus:border-teal-500"
                >
                  <option value="ALL">All Trips ({trips.length})</option>
                  <option value="IN_PROGRESS">In-Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            {/* Desktop Structured Table (>= 768px) */}
            <div className="hidden md:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-3">Customer / Booking</th>
                    <th className="p-3">Driver</th>
                    <th className="p-3">Route</th>
                    <th className="p-3 text-right">Start KM</th>
                    <th className="p-3 text-right">End KM</th>
                    <th className="p-3 text-right">Total KM</th>
                    <th className="p-3 text-right">Fuel (₹)</th>
                    <th className="p-3 text-right">Mileage</th>
                    <th className="p-3 text-right">Tolls/Extras</th>
                    <th className="p-3 text-right">Driver Bata</th>
                    <th className="p-3 text-right">Revenue (₹)</th>
                    <th className="p-3 text-right text-teal-700 dark:text-teal-400 font-bold">Net Profit</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-zinc-800">
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-slate-500 dark:text-zinc-400 font-sans">
                        No trip records found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((trip) => (
                      <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition">
                        <td className="p-3 font-sans font-bold text-slate-900 dark:text-zinc-100">
                          {trip.customer_name}
                          <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono font-normal">
                            {formatDateTime(trip.start_time)}
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          {trip.driver_username === 'senthilraja' || !trip.driver_username ? (
                            <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 text-[10px] font-bold inline-flex items-center space-x-1">
                              <Crown className="w-2.5 h-2.5" />
                              <span>{trip.driver_username || 'senthilraja'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-700 dark:text-zinc-300 text-xs">@{trip.driver_username}</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-zinc-300 font-sans">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                            <span>{trip.destination}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right text-slate-700 dark:text-zinc-300 tabular-nums">{trip.start_km.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-zinc-300 tabular-nums">
                          {trip.end_km ? trip.end_km.toLocaleString() : '---'}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                          {trip.total_km ? `${trip.total_km.toFixed(1)} KM` : '---'}
                        </td>
                        <td className="p-3 text-right text-amber-700 dark:text-amber-400 tabular-nums">
                          ₹{(trip.total_fuel_amount_inr || 0).toLocaleString()}
                          {trip.total_fuel_liters > 0 && (
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 tabular-nums">({trip.total_fuel_liters} L)</div>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                          {trip.mileage_kmpl ? `${trip.mileage_kmpl} KM/L` : '---'}
                        </td>
                        <td className="p-3 text-right text-slate-700 dark:text-zinc-300 tabular-nums">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">
                            ₹{(trip.tolls_and_extras_inr || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono tabular-nums">
                          {trip.driver_username === 'senthilraja' || !trip.driver_username || trip.driver_bata_inr === 0 ? (
                            <span className="text-teal-700 dark:text-teal-400 font-bold" title="Owner-driver: zero bata enforced">₹0 (Owner)</span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400">₹{(trip.driver_bata_inr || 0).toLocaleString()}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                          ₹{(trip.cash_received_inr || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-right font-bold text-sm text-teal-700 dark:text-teal-400 tabular-nums">
                          ₹{(trip.net_profit_inr || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              trip.status === 'COMPLETED'
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
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

            {/* Mobile Stacked Summary Cards (< 768px, Zero Horizontal Overflow) */}
            <div className="md:hidden space-y-3">
              {filteredTrips.length === 0 ? (
                <div className="p-6 text-center text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-mono">
                  No trip records found matching your filters.
                </div>
              ) : (
                filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-zinc-100 text-sm truncate">
                          {trip.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
                          {formatDateTime(trip.start_time)}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono shrink-0 ${
                          trip.status === 'COMPLETED'
                            ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {trip.status === 'COMPLETED' ? 'Completed' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center text-xs text-slate-600 dark:text-zinc-300 space-x-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase block">Distance</span>
                        <span className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                          {trip.total_km ? `${trip.total_km.toFixed(1)} KM` : `${trip.start_km} KM`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase block">Mileage</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                          {trip.mileage_kmpl ? `${trip.mileage_kmpl} KM/L` : '---'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase block">Revenue</span>
                        <span className="font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                          ₹{(trip.cash_received_inr || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-zinc-400 text-[10px] uppercase block">Net Profit</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                          ₹{(trip.net_profit_inr || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-100 dark:border-zinc-800">
                      <span>Fuel: <strong className="text-amber-700 dark:text-amber-400 tabular-nums">₹{(trip.total_fuel_amount_inr || 0).toLocaleString()}</strong></span>
                      <span>Driver: <strong className="text-slate-700 dark:text-zinc-300">@{trip.driver_username || 'senthilraja'}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DIGITAL RECEIPT VAULT */}
        {activeTab === 'vault' && (
          <div className="space-y-4">
            <div className="p-3 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-300 font-sans flex items-center justify-between shadow-xs">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>
                  All diesel receipt photos are compressed (&lt;= 250 KB) client-side before sync and stored in high resolution.
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 tabular-nums">{receipts.length} Invoices</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {receipts.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-500 dark:text-zinc-400 font-sans bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg">
                  No diesel receipts uploaded yet. Log a fuel stop via the Driver Mobile PWA to test.
                </div>
              ) : (
                receipts.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xs hover:border-amber-500 transition flex flex-col justify-between"
                  >
                    <div className="relative bg-slate-100 dark:bg-zinc-950 h-44 flex items-center justify-center overflow-hidden">
                      {r.receipt_image_url ? (
                        <img
                          src={r.receipt_image_url}
                          alt="Fuel bill"
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => setSelectedReceiptUrl(r.receipt_image_url || null)}
                        />
                      ) : (
                        <div className="text-center p-4">
                          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                          <span className="text-xs font-mono text-slate-500">Digital Bill Record</span>
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedReceiptUrl(r.receipt_image_url || '/uploads/sample_diesel_bill.webp')}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-900/70 hover:bg-slate-900 text-white"
                        title="Inspect Invoice Fullscreen"
                        aria-label="Inspect Invoice Fullscreen"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">₹{r.amount_inr.toLocaleString()}</span>
                        {r.liters && <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold tabular-nums">{r.liters} L</span>}
                      </div>

                      <div className="text-xs font-sans font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {r.customer_name || 'Commercial Route Trip'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-zinc-400 pt-2 border-t border-slate-100 dark:border-zinc-800 tabular-nums">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {compliance.items.map((item) => {
                const isGreen = item.status === 'GREEN';
                const isAmber = item.status === 'AMBER';

                return (
                  <div
                    key={item.code}
                    className={`p-4 rounded-lg border transition shadow-xs ${
                      isGreen
                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : isAmber
                        ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-rose-300 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-zinc-400 uppercase">
                        {item.code}
                      </span>
                      {isGreen && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                      {isAmber && <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
                      {!isGreen && !isAmber && <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mt-2 font-sans">{item.name}</h3>

                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
                      <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-zinc-50 tabular-nums">
                        {item.days_remaining > 0 ? item.days_remaining : 0}
                        <span className="text-xs font-normal text-slate-500 dark:text-zinc-400 ml-1">days left</span>
                      </div>

                      <div
                        className={`mt-2 text-xs font-bold font-mono px-2 py-0.5 rounded-md inline-block ${
                          isGreen
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : isAmber
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {item.status_label}
                      </div>

                      <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-2 tabular-nums">
                        Expires: {formatDate(item.expiry_date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono shadow-xs">
              <span className="text-slate-500 dark:text-zinc-400">RTO Commercial Vehicle Regulatory Status:</span>
              <span className="text-teal-700 dark:text-teal-400 font-bold">Approved (23 Seats Commercial Passenger)</span>
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
              <div>
                <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-zinc-100 font-sans flex items-center space-x-2">
                  <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                  <span>Driver Fleet Authentication & Bata Policies</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                  Owner-driver (<code className="text-teal-700 dark:text-teal-400 font-mono">senthilraja</code>) is configured with <strong className="text-teal-700 dark:text-teal-400">₹0 Driver Bata</strong>. Hired drivers receive customizable daily Bata tracked under trip expenses.
                </p>
              </div>
              <button
                onClick={() => {
                  triggerDriverHaptic([40]);
                  setIsDriverModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-md bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-semibold text-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>Register Driver</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {drivers.map((drv) => (
                <div
                  key={drv.id}
                  className={`p-4 rounded-lg border shadow-xs ${
                    drv.is_owner_driver
                      ? 'border-teal-300 dark:border-teal-800/80 bg-teal-50/40 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {drv.is_owner_driver ? (
                        <span className="p-2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                          <Crown className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="p-2 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                          <Users className="w-4 h-4" />
                        </span>
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-zinc-100 font-sans">{drv.full_name}</div>
                        <div className="text-xs font-mono text-slate-500 dark:text-zinc-400">@{drv.username}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase font-mono ${
                        drv.is_active ? 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800' : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {drv.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-zinc-400">Role:</span>
                      <span className="text-slate-900 dark:text-zinc-100 font-semibold">
                        {drv.is_owner_driver ? '👑 Fleet Owner-Driver' : 'Hired Driver'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-zinc-400">Bata Policy:</span>
                      <span className={drv.is_owner_driver ? 'text-teal-700 dark:text-teal-400 font-bold' : 'text-amber-700 dark:text-amber-400 font-semibold'}>
                        {drv.is_owner_driver ? '₹0 (Enforced)' : 'Custom Per Trip'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-zinc-400 pt-1 tabular-nums">
                      <span>Registered:</span>
                      <span>{formatDate(drv.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal to Register New Driver */}
            {isDriverModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4">
                <div className="relative max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                      <h3 className="font-bold text-slate-900 dark:text-zinc-50 text-base font-sans">Register Driver Account</h3>
                    </div>
                    <button
                      onClick={() => setIsDriverModalOpen(false)}
                      className="p-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {driverCreateError && (
                    <div className="p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                      {driverCreateError}
                    </div>
                  )}

                  <form onSubmit={handleCreateDriver} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 uppercase mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. R. Murugan"
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md font-sans"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 uppercase mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. murugan"
                        value={newDriverUname}
                        onChange={(e) => setNewDriverUname(e.target.value)}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-700 dark:text-zinc-300 uppercase mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newDriverPass}
                        onChange={(e) => setNewDriverPass(e.target.value)}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                      <input
                        type="checkbox"
                        id="isOwnerDriver"
                        checked={newDriverIsOwner}
                        onChange={(e) => setNewDriverIsOwner(e.target.checked)}
                        className="w-4 h-4 rounded text-teal-600 bg-white border-slate-300 focus:ring-0"
                      />
                      <label htmlFor="isOwnerDriver" className="text-xs text-slate-700 dark:text-zinc-300 select-none cursor-pointer">
                        <strong className="text-slate-900 dark:text-zinc-100 block font-sans">Owner-Driver Account</strong>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-sans">
                          If checked, driver bata will be locked to ₹0 in all calculations.
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsDriverModalOpen(false)}
                        className="w-1/2 py-2 rounded-md border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold font-mono transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingDriver}
                        className="w-1/2 py-2 rounded-md bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold font-mono transition disabled:opacity-50"
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
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 flex items-center justify-center p-4">
            <div className="relative max-w-2xl w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xl">
              <div className="flex items-center justify-between p-3.5 border-b border-slate-200 dark:border-zinc-800">
                <span className="font-bold text-slate-900 dark:text-zinc-100 font-mono text-sm">Diesel Receipt High-Res Audit</span>
                <button
                  onClick={() => setSelectedReceiptUrl(null)}
                  className="p-1.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center min-h-[300px]">
                <img
                  src={selectedReceiptUrl}
                  alt="Fuel invoice"
                  className="max-h-[70vh] object-contain rounded-md border border-slate-200 dark:border-zinc-800"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE STICKY BOTTOM NAVIGATION BAR (md:hidden) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 border-t border-slate-200 dark:border-zinc-800 pb-safe md:hidden shadow-lg backdrop-blur-xs">
        <div className="grid grid-cols-5 h-14">
          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveTab('pnl');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'pnl'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">P&L</span>
          </button>

          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveTab('vault');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center relative transition active:scale-95 ${
              activeTab === 'vault'
                ? 'text-amber-600 dark:text-amber-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Vault</span>
            {receipts.length > 0 && (
              <span className="absolute top-1 right-3 px-1 py-0.2 text-[9px] font-bold rounded-full bg-amber-500 text-white tabular-nums">
                {receipts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveTab('compliance');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center relative transition active:scale-95 ${
              activeTab === 'compliance'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">RTO</span>
            {compliance?.requires_attention && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-2 right-4" />
            )}
          </button>

          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveTab('calendar');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'calendar'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Calendar</span>
          </button>

          <button
            onClick={() => {
              triggerDriverHaptic([30]);
              setActiveTab('drivers');
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center transition active:scale-95 ${
              activeTab === 'drivers'
                ? 'text-teal-700 dark:text-teal-400 font-bold'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">Drivers</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
