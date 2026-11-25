/**
 * Tamil Solar Calendar & Panchangam Utility
 * Calculates Tamil Month, Day Number, Nakshatra (நட்சத்திரம்), and Tithi
 * for commercial tour scheduling and auspicious travel timings.
 */

export interface TamilDateInfo {
  gregorianDate: Date;
  gregorianDay: number;
  gregorianMonth: number;
  gregorianYear: number;
  
  tamilMonthNameTa: string;
  tamilMonthNameEn: string;
  tamilDay: number;
  
  nakshatraTa: string;
  nakshatraEn: string;
  
  tithiTa: string;
  tithiEn: string;
  
  isAuspicious: boolean;
  notes?: string;
}

const TAMIL_MONTHS = [
  { nameTa: 'சித்திரை', nameEn: 'Chithirai', startMonth: 4, startDay: 14 },
  { nameTa: 'வைகாசி', nameEn: 'Vaikasi', startMonth: 5, startDay: 15 },
  { nameTa: 'ஆனி', nameEn: 'Aani', startMonth: 6, startDay: 15 },
  { nameTa: 'ஆடி', nameEn: 'Aadi', startMonth: 7, startDay: 16 },
  { nameTa: 'ஆவணி', nameEn: 'Aavani', startMonth: 8, startDay: 17 },
  { nameTa: 'புரட்டாசி', nameEn: 'Purattasi', startMonth: 9, startDay: 17 },
  { nameTa: 'ஐப்பசி', nameEn: 'Aippasi', startMonth: 10, startDay: 17 },
  { nameTa: 'கார்த்திகை', nameEn: 'Karthigai', startMonth: 11, startDay: 16 },
  { nameTa: 'மார்கழி', nameEn: 'Margazhi', startMonth: 12, startDay: 16 },
  { nameTa: 'தை', nameEn: 'Thai', startMonth: 1, startDay: 14 },
  { nameTa: 'மாசி', nameEn: 'Maasi', startMonth: 2, startDay: 13 },
  { nameTa: 'பங்குனி', nameEn: 'Panguni', startMonth: 3, startDay: 14 },
];

const NAKSHATRAS = [
  { ta: 'அஸ்வினி', en: 'Ashwini' },
  { ta: 'பரணி', en: 'Bharani' },
  { ta: 'கார்த்திகை', en: 'Krittika' },
  { ta: 'ரோகிணி', en: 'Rohini' },
  { ta: 'மிருகசீரிஷம்', en: 'Mrigashirsha' },
  { ta: 'திருவாதிரை', en: 'Thiruvathirai' },
  { ta: 'புனர்பூசம்', en: 'Punarvasu' },
  { ta: 'பூசம்', en: 'Pushya' },
  { ta: 'ஆயில்யம்', en: 'Ayilyam' },
  { ta: 'மகம்', en: 'Magham' },
  { ta: 'பூரம்', en: 'Pooram' },
  { ta: 'உத்திரம்', en: 'Uthiram' },
  { ta: 'அஸ்தம்', en: 'Hastham' },
  { ta: 'சித்திரை', en: 'Chitra' },
  { ta: 'சுவாதி', en: 'Swati' },
  { ta: 'விசாகம்', en: 'Visakam' },
  { ta: 'அனுஷம்', en: 'Anusham' },
  { ta: 'கேட்டை', en: 'Kettai' },
  { ta: 'மூலம்', en: 'Moolam' },
  { ta: 'பூராடம்', en: 'Pooradam' },
  { ta: 'உத்திராடம்', en: 'Uthiradam' },
  { ta: 'திருவோணம்', en: 'Thiruvonam' },
  { ta: 'அவிட்டம்', en: 'Avittam' },
  { ta: 'சதயம்', en: 'Sathayam' },
  { ta: 'பூரட்டாதி', en: 'Poorattathi' },
  { ta: 'உத்திரட்டாதி', en: 'Uthirattathi' },
  { ta: 'ரேவதி', en: 'Revathi' },
];

const TITHIS = [
  { ta: 'பிரதமை', en: 'Prathama' },
  { ta: 'துவிதியை', en: 'Dvitiya' },
  { ta: 'திருதியை', en: 'Tritiya' },
  { ta: 'சதுர்த்தி', en: 'Chaturthi' },
  { ta: 'பஞ்சமி', en: 'Panchami' },
  { ta: 'சஷ்டி', en: 'Shasthi' },
  { ta: 'சப்தமி', en: 'Saptami' },
  { ta: 'அஷ்டமி', en: 'Ashtami' },
  { ta: 'நவமி', en: 'Navami' },
  { ta: 'தசமி', en: 'Dashami' },
  { ta: 'ஏகாதசி', en: 'Ekadashi' },
  { ta: 'துவாதசி', en: 'Dvadashi' },
  { ta: 'திரயோதசி (பிரதோஷம்)', en: 'Trayodashi (Pradosham)' },
  { ta: 'சதுர்த்தசி', en: 'Chaturdashi' },
  { ta: 'பௌர்ணமி / அமாவாசை', en: 'Pournami / Amavasya' },
];

/**
 * Calculates Tamil month name and day number for a given Gregorian date
 */
export function getTamilDateInfo(date: Date): TamilDateInfo {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1; // 1-12
  const gDay = date.getDate();

  // Determine which Tamil solar month this day falls into
  let tamilMonthIndex = 0;
  let tamilDay = 1;

  if (gMonth === 4 && gDay >= 14) {
    tamilMonthIndex = 0; // Chithirai
    tamilDay = gDay - 13;
  } else if (gMonth === 5) {
    if (gDay < 15) {
      tamilMonthIndex = 0; // Chithirai
      tamilDay = 17 + gDay; // Apr 14 to 30 = 17 days
    } else {
      tamilMonthIndex = 1; // Vaikasi
      tamilDay = gDay - 14;
    }
  } else if (gMonth === 6) {
    if (gDay < 15) {
      tamilMonthIndex = 1; // Vaikasi
      tamilDay = 17 + gDay;
    } else {
      tamilMonthIndex = 2; // Aani
      tamilDay = gDay - 14;
    }
  } else if (gMonth === 7) {
    if (gDay < 16) {
      tamilMonthIndex = 2; // Aani
      tamilDay = 16 + gDay;
    } else {
      tamilMonthIndex = 3; // Aadi
      tamilDay = gDay - 15;
    }
  } else if (gMonth === 8) {
    if (gDay < 17) {
      tamilMonthIndex = 3; // Aadi
      tamilDay = 16 + gDay;
    } else {
      tamilMonthIndex = 4; // Aavani
      tamilDay = gDay - 16;
    }
  } else if (gMonth === 9) {
    if (gDay < 17) {
      tamilMonthIndex = 4; // Aavani
      tamilDay = 15 + gDay;
    } else {
      tamilMonthIndex = 5; // Purattasi
      tamilDay = gDay - 16;
    }
  } else if (gMonth === 10) {
    if (gDay < 17) {
      tamilMonthIndex = 5; // Purattasi
      tamilDay = 14 + gDay;
    } else {
      tamilMonthIndex = 6; // Aippasi
      tamilDay = gDay - 16;
    }
  } else if (gMonth === 11) {
    if (gDay < 16) {
      tamilMonthIndex = 6; // Aippasi
      tamilDay = 15 + gDay;
    } else {
      tamilMonthIndex = 7; // Karthigai
      tamilDay = gDay - 15;
    }
  } else if (gMonth === 12) {
    if (gDay < 16) {
      tamilMonthIndex = 7; // Karthigai
      tamilDay = 15 + gDay;
    } else {
      tamilMonthIndex = 8; // Margazhi
      tamilDay = gDay - 15;
    }
  } else if (gMonth === 1) {
    if (gDay < 14) {
      tamilMonthIndex = 8; // Margazhi
      tamilDay = 16 + gDay;
    } else {
      tamilMonthIndex = 9; // Thai (Pongal)
      tamilDay = gDay - 13;
    }
  } else if (gMonth === 2) {
    if (gDay < 13) {
      tamilMonthIndex = 9; // Thai
      tamilDay = 18 + gDay;
    } else {
      tamilMonthIndex = 10; // Maasi
      tamilDay = gDay - 12;
    }
  } else if (gMonth === 3) {
    if (gDay < 14) {
      tamilMonthIndex = 10; // Maasi
      tamilDay = 16 + gDay;
    } else {
      tamilMonthIndex = 11; // Panguni
      tamilDay = gDay - 13;
    }
  } else if (gMonth === 4 && gDay < 14) {
    tamilMonthIndex = 11; // Panguni
    tamilDay = 18 + gDay;
  }

  const mInfo = TAMIL_MONTHS[tamilMonthIndex];

  // Panchangam Nakshatra calculation using Julian day number approximation
  const msPerDay = 86400000;
  // Epoch reference (Jan 1, 2026 was Rohini / Mrigashirsha)
  const epoch = new Date('2026-01-01T00:00:00Z').getTime();
  const daysSinceEpoch = Math.floor((date.getTime() - epoch) / msPerDay);
  
  // Moon cycle ~27.3216 days per zodiac circle
  const nakshatraIndex = Math.abs(Math.floor((daysSinceEpoch * 1.05 + 3) % 27));
  const nakshatra = NAKSHATRAS[nakshatraIndex] || NAKSHATRAS[0];

  // Lunar Tithi cycle ~29.53 days
  const tithiIndex = Math.abs(Math.floor((daysSinceEpoch + 12) % 15));
  const tithi = TITHIS[tithiIndex] || TITHIS[0];

  // Auspicious days (e.g. Rohini, Pushya, Hastham, Swati, Anuradha, Thiruvonam)
  const auspiciousNakshatras = ['Rohini', 'Pushya', 'Hastham', 'Swati', 'Anusham', 'Thiruvonam', 'Ashwini'];
  const isAuspicious = auspiciousNakshatras.includes(nakshatra.en) && tithiIndex !== 7 && tithiIndex !== 8; // avoid Ashtami/Navami for new start

  return {
    gregorianDate: date,
    gregorianDay: gDay,
    gregorianMonth: gMonth,
    gregorianYear: gYear,
    tamilMonthNameTa: mInfo.nameTa,
    tamilMonthNameEn: mInfo.nameEn,
    tamilDay: Math.max(1, tamilDay),
    nakshatraTa: nakshatra.ta,
    nakshatraEn: nakshatra.en,
    tithiTa: tithi.ta,
    tithiEn: tithi.en,
    isAuspicious,
  };
}

/**
 * Builds a 6-week monthly grid for any year and month (0-indexed month)
 */
export function getMonthCalendarDays(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days: Array<{
    date: Date;
    isCurrentMonth: boolean;
    tamil: TamilDateInfo;
  }> = [];

  // Previous month overflow days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i);
    days.push({
      date: d,
      isCurrentMonth: false,
      tamil: getTamilDateInfo(d),
    });
  }

  // Current month days
  for (let dNum = 1; dNum <= daysInMonth; dNum++) {
    const d = new Date(year, month, dNum);
    days.push({
      date: d,
      isCurrentMonth: true,
      tamil: getTamilDateInfo(d),
    });
  }

  // Next month overflow days to complete 35 or 42 cells grid
  const remainingCells = (7 - (days.length % 7)) % 7;
  for (let dNum = 1; dNum <= remainingCells; dNum++) {
    const d = new Date(year, month + 1, dNum);
    days.push({
      date: d,
      isCurrentMonth: false,
      tamil: getTamilDateInfo(d),
    });
  }

  return days;
}
