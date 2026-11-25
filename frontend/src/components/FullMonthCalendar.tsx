import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  MapPin,
  Phone,
  User,
  Sparkles,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api, type CalendarEventItem, type BookingCalendarEventCreatePayload } from '../lib/api';
import { useLanguage } from '../i18n/LanguageContext';
import { getMonthCalendarDays, type TamilDateInfo } from '../lib/tamilCalendar';
import { triggerDriverHaptic, formatLocalizedDate, formatLocalizedDateTime } from '../lib/formatters';

interface FullMonthCalendarProps {
  onClose?: () => void;
  isModal?: boolean;
}

export interface DayEventMatch {
  event: CalendarEventItem;
  dayIndex: number;
  totalDays: number;
  isStart: boolean;
  isEnd: boolean;
  isMiddle: boolean;
}

const formatIsoDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDaysToDate = (dateStr: string, daysToAdd: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return formatIsoDate(dt);
};

const calcDaysBetween = (startStr: string, endStr: string): number => {
  const [y1, m1, d1] = startStr.split('-').map(Number);
  const [y2, m2, d2] = endStr.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.round((t2 - t1) / (24 * 60 * 60 * 1000));
  return Math.max(1, diffDays + 1);
};

export const FullMonthCalendar: React.FC<FullMonthCalendarProps> = ({ onClose, isModal = false }) => {
  const { t, language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEventItem[]>([]);

  // Selected date modal state
  const [selectedDay, setSelectedDay] = useState<{ date: Date; tamil: TamilDateInfo } | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // New Tour Form State (supporting multi-day durations)
  const [tourTitle, setTourTitle] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [destination, setDestination] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'CONFIRMED' | 'INQUIRY' | 'MAINTENANCE'>('CONFIRMED');

  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('22:00');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = async () => {
    try {
      const data = await api.getCalendarEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handlePrevMonth = () => {
    triggerDriverHaptic([30]);
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    triggerDriverHaptic([30]);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysGrid = getMonthCalendarDays(year, month);

  // Find all events that overlap day d (including multi-day spans)
  const getEventMatchesForDay = (d: Date): DayEventMatch[] => {
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    return events
      .map((ev) => {
        const eStart = new Date(ev.start_time);
        const eEnd = new Date(ev.end_time);

        if (eStart <= dayEnd && eEnd >= dayStart) {
          const startDayMidnight = new Date(eStart.getFullYear(), eStart.getMonth(), eStart.getDate()).getTime();
          const endDayMidnight = new Date(eEnd.getFullYear(), eEnd.getMonth(), eEnd.getDate()).getTime();
          const curDayMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

          const msPerDay = 24 * 60 * 60 * 1000;
          const totalDays = Math.max(1, Math.round((endDayMidnight - startDayMidnight) / msPerDay) + 1);
          const dayIndex = Math.max(1, Math.round((curDayMidnight - startDayMidnight) / msPerDay) + 1);

          const isStart = curDayMidnight === startDayMidnight;
          const isEnd = curDayMidnight === endDayMidnight;
          const isMiddle = !isStart && !isEnd;

          return {
            event: ev,
            dayIndex: Math.min(dayIndex, totalDays),
            totalDays,
            isStart,
            isEnd,
            isMiddle,
          };
        }
        return null;
      })
      .filter((m): m is DayEventMatch => m !== null);
  };

  const handleDayClick = (item: { date: Date; tamil: TamilDateInfo }) => {
    triggerDriverHaptic([40]);
    setSelectedDay(item);

    const isoStr = formatIsoDate(item.date);
    const yStr = item.date.getFullYear();
    const mStr = String(item.date.getMonth() + 1).padStart(2, '0');
    const dStr = String(item.date.getDate()).padStart(2, '0');

    const defaultTitle =
      language === 'ta'
        ? `சுற்றுலா பயணம் - ${dStr}/${mStr}/${yStr}`
        : `Commercial Tour - ${dStr}/${mStr}/${yStr}`;

    setTourTitle(defaultTitle);
    setCustomerName('');
    setDestination('');
    setPhone('');
    setStatus('CONFIRMED');

    setStartDateStr(isoStr);
    setEndDateStr(isoStr);
    setDurationDays(1);
    setStartTime('06:00');
    setEndTime('22:00');

    setFormError(null);
    setIsBookingModalOpen(true);
  };

  // Quick duration selection (1, 2, 3, 4, 5, 7, 10 days)
  const handleSelectDuration = (days: number) => {
    triggerDriverHaptic([30]);
    setDurationDays(days);
    if (startDateStr) {
      setEndDateStr(addDaysToDate(startDateStr, days - 1));
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDateStr(newStart);
    if (newStart && durationDays > 0) {
      setEndDateStr(addDaysToDate(newStart, durationDays - 1));
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    setEndDateStr(newEnd);
    if (startDateStr && newEnd) {
      const days = calcDaysBetween(startDateStr, newEnd);
      setDurationDays(days);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDateStr || !endDateStr || !tourTitle.trim() || !customerName.trim()) {
      setFormError('Please complete all required fields.');
      return;
    }

    if (new Date(endDateStr) < new Date(startDateStr)) {
      setFormError(language === 'ta' ? 'முடிவுத் தேதி தொடக்கத் தேதிக்கு பின்னர் இருக்க வேண்டும்' : 'End date must be on or after start date');
      return;
    }

    triggerDriverHaptic([60, 40]);
    setIsSubmitting(true);
    setFormError(null);

    const colorIdMap = {
      CONFIRMED: '10',
      INQUIRY: '5',
      MAINTENANCE: '11',
    };

    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const [sh, smin] = startTime.split(':').map(Number);
    const start_dt = new Date(sy, sm - 1, sd, sh, smin, 0);

    const [ey, em, ed] = endDateStr.split('-').map(Number);
    const [eh, emin] = endTime.split(':').map(Number);
    const end_dt = new Date(ey, em - 1, ed, eh, emin, 0);

    const payload: BookingCalendarEventCreatePayload = {
      title: tourTitle.trim(),
      customer_name: customerName.trim(),
      destination: destination.trim() || (language === 'ta' ? 'வெளிவட்டார சுற்றுலா பயணம்' : 'Outstation Commercial Tour'),
      phone: phone.trim() || undefined,
      start_time: start_dt.toISOString(),
      end_time: end_dt.toISOString(),
      color_id: colorIdMap[status],
      status,
    };

    try {
      await api.createCalendarEvent(payload);
      await loadEvents();
      setIsBookingModalOpen(false);
      triggerDriverHaptic([80, 50, 80]);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to schedule booking');
      triggerDriverHaptic([100, 50, 100]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthNamesTa = [
    'ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
    'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'
  ];

  const weekdayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayNamesTa = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];

  const selectedDayEventMatches = selectedDay ? getEventMatchesForDay(selectedDay.date) : [];

  return (
    <div className={`flex flex-col bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden ${isModal ? 'max-h-[90vh]' : 'w-full'}`}>
      {/* 1. Header Toolbar */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <CalendarIcon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-zinc-50 tracking-tight">
              {language === 'ta' ? monthNamesTa[month] : monthNamesEn[month]} {year}
            </h2>
            <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono">
              {t.fullMonthCalendarTitle}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition"
            title={t.prevMonth}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-xs font-mono font-semibold rounded-md bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition"
          >
            {t.todayLabel}
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 transition"
            title={t.nextMonth}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 ml-2 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition"
              title={t.closeCalendarBtn}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Weekday Header */}
      <div className="grid grid-cols-7 bg-slate-100 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 text-center text-[11px] font-mono font-semibold text-slate-600 dark:text-zinc-400 py-2">
        {(language === 'ta' ? weekdayNamesTa : weekdayNamesEn).map((dName, idx) => (
          <div key={idx} className={idx === 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
            {dName}
          </div>
        ))}
      </div>

      {/* 3. Monthly Days Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-zinc-800 overflow-y-auto">
        {daysGrid.map((item, index) => {
          const isToday =
            item.date.getDate() === new Date().getDate() &&
            item.date.getMonth() === new Date().getMonth() &&
            item.date.getFullYear() === new Date().getFullYear();

          const dayMatches = getEventMatchesForDay(item.date);

          return (
            <div
              key={index}
              onClick={() => handleDayClick(item)}
              className={`min-h-[90px] md:min-h-[110px] p-1.5 md:p-2 cursor-pointer transition flex flex-col justify-between ${
                item.isCurrentMonth
                  ? 'bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80'
                  : 'bg-slate-50/70 dark:bg-zinc-950/60 text-slate-400 dark:text-zinc-600'
              } ${isToday ? 'ring-2 ring-teal-600 dark:ring-teal-500 ring-inset bg-teal-50/40 dark:bg-teal-950/20' : ''}`}
            >
              {/* Top row: Gregorian Day & Auspicious icon */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs md:text-sm font-bold font-mono tabular-nums ${
                    isToday
                      ? 'w-6 h-6 rounded-full bg-teal-700 dark:bg-teal-600 text-white flex items-center justify-center'
                      : item.isCurrentMonth
                      ? 'text-slate-900 dark:text-zinc-100'
                      : 'text-slate-400 dark:text-zinc-600'
                  }`}
                >
                  {item.tamil.gregorianDay}
                </span>

                {item.tamil.isAuspicious && (
                  <span title={t.auspiciousDayBadge} className="text-amber-500">
                    <Sparkles className="w-3 h-3 fill-current" />
                  </span>
                )}
              </div>

              {/* Middle row: Tamil Month & Date + Nakshatra */}
              <div className="my-1 space-y-0.5">
                <div className="text-[10px] md:text-[11px] font-semibold text-teal-700 dark:text-teal-400 leading-tight">
                  {language === 'ta'
                    ? `${item.tamil.tamilMonthNameTa} ${item.tamil.tamilDay}`
                    : `${item.tamil.tamilMonthNameEn} ${item.tamil.tamilDay}`}
                </div>
                <div className="text-[9px] md:text-[10px] text-slate-500 dark:text-zinc-400 truncate leading-tight">
                  {language === 'ta' ? item.tamil.nakshatraTa : item.tamil.nakshatraEn}
                </div>
              </div>

              {/* Bottom row: Multi-Day Connected Booking Badges */}
              <div className="space-y-1 mt-auto">
                {dayMatches.slice(0, 2).map((match) => {
                  const ev = match.event;
                  let badgeColors = 'bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200';
                  if (ev.color_id === '5' || ev.status === 'INQUIRY') {
                    badgeColors = 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200';
                  } else if (ev.color_id === '11' || ev.status === 'MAINTENANCE') {
                    badgeColors = 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
                  }

                  // Multi-day indicator icon & progress
                  let prefix = '';
                  let progressTag = '';
                  if (match.totalDays > 1) {
                    if (match.isStart) {
                      prefix = '➔ ';
                      progressTag = ` (${language === 'ta' ? `நாள் 1/${match.totalDays}` : `D1/${match.totalDays}`})`;
                    } else if (match.isMiddle) {
                      prefix = '═ ';
                      progressTag = ` (${language === 'ta' ? `நாள் ${match.dayIndex}/${match.totalDays}` : `D${match.dayIndex}/${match.totalDays}`})`;
                    } else if (match.isEnd) {
                      prefix = '🏁 ';
                      progressTag = ` (${language === 'ta' ? `நாள் ${match.totalDays}/${match.totalDays}` : `D${match.totalDays}/${match.totalDays}`})`;
                    }
                  }

                  return (
                    <div
                      key={ev.id}
                      className={`text-[9px] px-1 py-0.5 rounded border truncate font-mono flex items-center justify-between ${badgeColors} ${
                        match.totalDays > 1 && match.isStart ? 'border-r-0 rounded-r-none' : ''
                      } ${match.totalDays > 1 && match.isMiddle ? 'border-l-0 border-r-0 rounded-none bg-opacity-70' : ''} ${
                        match.totalDays > 1 && match.isEnd ? 'border-l-0 rounded-l-none' : ''
                      }`}
                      title={`${ev.title} (${ev.customer_name}) - ${match.totalDays} Days`}
                    >
                      <span className="truncate">
                        {prefix}{ev.title}
                      </span>
                      {progressTag && <span className="text-[8px] opacity-80 flex-shrink-0 ml-0.5">{progressTag}</span>}
                    </div>
                  );
                })}
                {dayMatches.length > 2 && (
                  <div className="text-[8px] text-slate-500 dark:text-zinc-400 font-mono text-center">
                    {t.moreEventsCount(dayMatches.length - 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Legend Footer */}
      <div className="px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 text-[11px] font-mono flex flex-wrap items-center justify-between gap-3 text-slate-600 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-400" />
            <span>{t.slotConfirmed}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>{t.slotPending}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>{t.slotMaintenance}</span>
          </div>
          <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-300 dark:border-zinc-700">
            <span className="text-slate-800 dark:text-zinc-200 font-bold">➔ ═ 🏁</span>
            <span>{t.multiDayTourLegend}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400">
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>{t.auspiciousDayBadge}</span>
        </div>
      </div>

      {/* 5. Date Click Booking Modal (Multi-Day Duration & Complete Translations) */}
      {isBookingModalOpen && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-slate-900/60 dark:bg-black/75">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-50 flex items-center space-x-2">
                  <span>{t.tourDetailsModalTitle}</span>
                  <span className="text-teal-700 dark:text-teal-400 font-mono">
                    {formatLocalizedDate(selectedDay.date, language)}
                  </span>
                </h3>
                <div className="text-xs text-teal-700 dark:text-teal-400 font-mono mt-0.5">
                  {language === 'ta'
                    ? `${selectedDay.tamil.tamilMonthNameTa} ${selectedDay.tamil.tamilDay} • ${t.nakshatraLabel}: ${selectedDay.tamil.nakshatraTa} • ${selectedDay.tamil.tithiTa}`
                    : `${selectedDay.tamil.tamilMonthNameEn} ${selectedDay.tamil.tamilDay} • ${t.nakshatraLabel}: ${selectedDay.tamil.nakshatraEn} • ${selectedDay.tamil.tithiEn}`}
                </div>
              </div>

              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="p-1.5 rounded-md text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Existing Bookings on this Day */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300">
                  {t.toursOnDate(selectedDayEventMatches.length)}:
                </div>
                {selectedDayEventMatches.length === 0 ? (
                  <div className="p-3 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400 font-mono text-center">
                    {t.noBookingsOnDate}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDayEventMatches.map((match) => {
                      const ev = match.event;
                      return (
                        <div
                          key={ev.id}
                          className="p-3 rounded-md bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs space-y-1.5 font-mono"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-900 dark:text-zinc-100 font-bold">{ev.title}</span>
                            <div className="flex items-center space-x-2">
                              {match.totalDays > 1 && (
                                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                  {t.dayProgressBadge(match.dayIndex, match.totalDays)} ({t.tourDurationDays(match.totalDays)})
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  ev.color_id === '10'
                                    ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800'
                                    : ev.color_id === '5'
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {ev.status}
                              </span>
                            </div>
                          </div>

                          <div className="text-slate-500 dark:text-zinc-400 flex items-center space-x-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>
                              {formatLocalizedDateTime(ev.start_time, language)} ➔ {formatLocalizedDateTime(ev.end_time, language)}
                            </span>
                          </div>

                          <div className="text-slate-700 dark:text-zinc-300 flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.customerContactLabel}: {ev.customer_name}</span>
                          </div>

                          {ev.destination && (
                            <div className="text-slate-500 dark:text-zinc-400 flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.routeLabel}: {ev.destination}</span>
                            </div>
                          )}

                          {ev.phone && (
                            <div className="text-slate-500 dark:text-zinc-400 flex items-center space-x-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t.phoneLabel}: {ev.phone}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Tour Booking Form with Duration Selector */}
              <div className="pt-3 border-t border-slate-200 dark:border-zinc-800">
                <div className="text-xs font-mono font-bold text-teal-700 dark:text-teal-400 mb-3 flex items-center space-x-1.5">
                  <Plus className="w-4 h-4" />
                  <span>{t.addTourBtn}</span>
                </div>

                {formError && (
                  <div className="mb-3 p-2.5 rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-mono">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleCreateBooking} className="space-y-3.5">
                  {/* Quick Duration Buttons */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono">
                      {t.quickDurationSelect}
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {[1, 2, 3, 4, 5, 7, 10].map((dCount) => (
                        <button
                          key={dCount}
                          type="button"
                          onClick={() => handleSelectDuration(dCount)}
                          className={`py-1.5 px-2 rounded-md text-xs font-mono font-bold transition flex flex-col items-center justify-center ${
                            durationDays === dCount
                              ? 'bg-teal-700 dark:bg-teal-600 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          <span>{dCount} {language === 'ta' ? 'நாள்' : 'D'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Day Date Range Pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourStartDateLabel} *
                      </label>
                      <input
                        type="date"
                        value={startDateStr}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                        required
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourEndDateLabel} *
                      </label>
                      <input
                        type="date"
                        value={endDateStr}
                        min={startDateStr}
                        onChange={(e) => handleEndDateChange(e.target.value)}
                        required
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourStartTimeLabel}
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourEndTimeLabel}
                      </label>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    {/* Duration Summary Badge */}
                    <div className="col-span-full pt-1">
                      <div className="p-2 rounded-md bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-xs font-mono text-teal-800 dark:text-teal-300 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span className="font-bold">
                            {t.multiDayTourSummary(
                              durationDays,
                              formatLocalizedDate(startDateStr, language),
                              formatLocalizedDate(endDateStr, language)
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-600 text-white">
                          {t.tourDurationDays(durationDays)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                      {t.tourTitleLabel} *
                    </label>
                    <input
                      type="text"
                      value={tourTitle}
                      onChange={(e) => setTourTitle(e.target.value)}
                      required
                      placeholder={t.tourPlaceholder}
                      className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                      {t.tourCustomerLabel} *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder={t.customerPlaceholder}
                      className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourDestinationLabel}
                      </label>
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder={t.destinationPlaceholder}
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                        {t.tourPhoneLabel}
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98450 12345"
                        className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-zinc-300 mb-1 font-mono">
                      {t.tourStatusLabel}
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full p-2 text-base md:text-xs text-slate-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-md font-mono"
                    >
                      <option value="CONFIRMED">🟢 {t.slotConfirmed} (Color 10)</option>
                      <option value="INQUIRY">🟡 {t.slotPending} (Color 5)</option>
                      <option value="MAINTENANCE">🔴 {t.slotMaintenance} (Color 11)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(false)}
                      className="w-1/3 py-2.5 rounded-md border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold font-mono transition"
                    >
                      {t.cancelBtn}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-2/3 min-h-[46px] rounded-md bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 text-white text-xs font-semibold tracking-wide flex items-center justify-center space-x-2 transition disabled:opacity-50"
                    >
                      <span>{isSubmitting ? t.savingTourBooking : t.saveTourBookingBtn}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
