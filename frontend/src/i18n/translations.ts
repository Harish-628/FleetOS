export type Language = 'en' | 'ta';

export interface Translations {
  // Common / Navigation
  appName: string;
  driverPwa: string;
  adminPortal: string;
  busSubtitle: string;
  coachName: string;
  scanQr: string;

  // Language Toggle
  langToggle: string;
  currentLangName: string;

  // Sync Status
  onlineSynced: string;
  offlineQueued: (count: number) => string;
  syncing: string;
  forceSync: string;
  syncedAt: (time: string) => string;

  // Workflow Tabs
  tabTripStart: string;
  tabFuelStop: string;
  tabTripEnd: string;
  stepIndicator: (step: number, total: number) => string;

  // Driver Slot Picker
  tripSchedule: string;
  tripScheduleDesc: string;
  manualTripBtn: string;
  selectedSlotBadge: string;
  tapToSelect: string;
  todayLabel: string;
  tomorrowLabel: string;
  upcomingLabel: string;
  noSlotsFound: string;
  slotConfirmed: string;
  slotPending: string;
  slotMaintenance: string;
  clearSlot: string;

  // Phase 1: Trip Start
  activeTripWarning: string;
  startTripHeading: string;
  startTripSubheading: string;
  customerNameLabel: string;
  customerNamePlaceholder: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  startKmLabel: string;
  startKmPlaceholder: string;
  startKmHelp: string;
  startTripBtn: string;
  smartAutoFillHint: string;

  // Phase 2: Fuel Stop
  activeTripLabel: string;
  currentTripRoute: string;
  fuelStopHeading: string;
  fuelStopSubheading: string;
  fuelAmountLabel: string;
  fuelAmountPlaceholder: string;
  fuelLitersLabel: string;
  fuelLitersPlaceholder: string;
  fuelBillPhotoLabel: string;
  tapToCaptureBill: string;
  billCaptured: string;
  retakeBill: string;
  compressingImage: string;
  logFuelBtn: string;
  skipToFinish: string;
  loggedReceiptsTitle: string;
  noReceiptsYet: string;

  // Phase 3: Trip End
  finishTripHeading: string;
  finishTripSubheading: string;
  endKmLabel: string;
  endKmPlaceholder: string;
  endKmHelp: (startKm: number) => string;
  endKmError: (startKm: number) => string;
  cashReceivedLabel: string;
  cashReceivedPlaceholder: string;
  tollsLabel: string;
  tollsPlaceholder: string;
  roadExpensesBreakdown: string;
  tollBoxLabel: string;
  rtoBoxLabel: string;
  parkingBoxLabel: string;
  otherExpensesBoxLabel: string;
  totalRoadExpensesLabel: string;
  livePnLSummary: string;
  totalDistance: string;
  fuelExpenses: string;
  netProfit: string;
  finishTripBtn: string;
  finishing: string;

  // Speech Recognition
  speechListening: string;
  speechTapToSpeak: string;
  speechDenied: string;
  speechNotSupported: string;

  // Driver Authentication & Bata Rule
  driverLoginHeading: string;
  driverLoginSubheading: string;
  driverUsernameLabel: string;
  driverPasswordLabel: string;
  driverLoginBtn: string;
  driverLoggingIn: string;
  driverLogoutBtn: string;
  driverLoggedAs: (name: string) => string;
  ownerDriverBadge: string;
  hiredDriverBadge: string;
  driverBataLabel: string;
  driverBataPlaceholder: string;
  driverBataOwnerZero: string;
  switchAccount: string;
  invalidDriverCredentials: string;

  // Full Month Tamil Calendar
  fullMonthCalendarTitle: string;
  openCalendarBtn: string;
  closeCalendarBtn: string;
  prevMonth: string;
  nextMonth: string;
  tamilMonthLabel: string;
  nakshatraLabel: string;
  tithiLabel: string;
  addTourBtn: string;
  tourDetailsModalTitle: string;
  dateSelectedLabel: (dateStr: string) => string;
  tourTitleLabel: string;
  tourCustomerLabel: string;
  tourDestinationLabel: string;
  tourPhoneLabel: string;
  tourStartTimeLabel: string;
  tourEndTimeLabel: string;
  tourStatusLabel: string;
  saveTourBookingBtn: string;
  savingTourBooking: string;
  auspiciousDayBadge: string;
  toursOnDate: (count: number) => string;

  // Multi-Day & Duration Calendar Translations
  tourStartDateLabel: string;
  tourEndDateLabel: string;
  tourDurationLabel: string;
  tourDurationDays: (days: number) => string;
  quickDurationSelect: string;
  multiDayTourSummary: (days: number, start: string, end: string) => string;
  dayProgressBadge: (current: number, total: number) => string;
  noBookingsOnDate: string;
  moreEventsCount: (count: number) => string;
  gcalSchemaLegend: string;
  multiDayTourLegend: string;
  cancelBtn: string;
  customerContactLabel: string;
  routeLabel: string;
  phoneLabel: string;
  tourPlaceholder: string;
  customerPlaceholder: string;
  tourDayIndicator: (day: number) => string;
  calendarLegendTitle: string;

  // 5-Day Advance Tour Notifications
  advanceAlertsTitle: string;
  upcomingToursCount: (count: number) => string;
  upcomingTourInDays: (days: number, title: string) => string;
  upcomingTourToday: (title: string) => string;
  upcomingTourTomorrow: (title: string) => string;
  enableNotificationsBtn: string;
  notificationsEnabled: string;
  notificationBannerDismiss: string;
  notificationBellTooltip: string;

  // Drivers Management (Admin)
  driversManagementTitle: string;
  createDriverBtn: string;
  driverFullNameLabel: string;
  isOwnerDriverCheckbox: string;
  driverCreatedSuccess: string;
  driverActiveStatus: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Vinoth Travels',
    driverPwa: 'Driver PWA',
    adminPortal: 'Admin Portal',
    busSubtitle: 'TN37aw6052 (23-Seater)',
    coachName: 'Ashok Leyland Lynx Tourer',
    scanQr: 'Scan QR Code to launch on Driver Mobile',

    langToggle: 'EN | தமிழ்',
    currentLangName: 'English',

    onlineSynced: 'Online • All Synced',
    offlineQueued: (count: number) => `Offline • ${count} ${count === 1 ? 'Record' : 'Records'} Queued`,
    syncing: 'Syncing...',
    forceSync: 'Force Sync',
    syncedAt: (time: string) => `Synced ${time}`,

    tabTripStart: 'Trip Start',
    tabFuelStop: 'Fuel Stop',
    tabTripEnd: 'Trip End',
    stepIndicator: (step: number, total: number) => `Step ${step} of ${total}`,

    tripSchedule: 'Trip Schedule & Slots',
    tripScheduleDesc: 'Tap a booked slot to auto-fill customer and destination details',
    manualTripBtn: 'Manual / Walk-in Trip',
    selectedSlotBadge: 'Selected Slot',
    tapToSelect: 'Tap to select',
    todayLabel: 'Today',
    tomorrowLabel: 'Tomorrow',
    upcomingLabel: 'Upcoming',
    noSlotsFound: 'No booked calendar slots for this period',
    slotConfirmed: 'Confirmed',
    slotPending: 'Inquiry',
    slotMaintenance: 'Maintenance',
    clearSlot: 'Clear Slot',

    activeTripWarning: 'A trip is currently in progress. Please complete or log fuel.',
    startTripHeading: 'Start New Trip',
    startTripSubheading: 'Enter odometer reading and booking details before journey begins',
    customerNameLabel: 'Customer / Company Name',
    customerNamePlaceholder: 'e.g. Infosys Technologies / Rajesh',
    destinationLabel: 'Destination / Route',
    destinationPlaceholder: 'e.g. Bangalore to Coorg Outstation',
    startKmLabel: 'Starting Odometer (KM)',
    startKmPlaceholder: 'e.g. 142380',
    startKmHelp: 'Verify vehicle dashboard odometer value before moving vehicle',
    startTripBtn: 'Confirm & Start Trip',
    smartAutoFillHint: 'Today confirmed calendar booking auto-detected',

    activeTripLabel: 'Active Trip',
    currentTripRoute: 'Current Route',
    fuelStopHeading: 'Log Fuel Stop (Diesel)',
    fuelStopSubheading: 'Enter fuel expense and attach photo of diesel pump receipt',
    fuelAmountLabel: 'Diesel Cost (₹ INR)',
    fuelAmountPlaceholder: 'e.g. 4500',
    fuelLitersLabel: 'Diesel Quantity (Liters - Optional)',
    fuelLitersPlaceholder: 'e.g. 50.2',
    fuelBillPhotoLabel: 'Diesel Receipt Photo',
    tapToCaptureBill: 'Tap to take photo of diesel receipt',
    billCaptured: 'Receipt photo captured & compressed',
    retakeBill: 'Retake photo',
    compressingImage: 'Compressing bill image...',
    logFuelBtn: 'Save Fuel Receipt',
    skipToFinish: 'Proceed to End Trip',
    loggedReceiptsTitle: 'Logged Fuel Receipts for this Trip',
    noReceiptsYet: 'No fuel receipts recorded for this trip yet.',

    finishTripHeading: 'End Trip & Close Ledger',
    finishTripSubheading: 'Record ending odometer, customer cash collected, and toll expenses',
    endKmLabel: 'Closing Odometer (KM)',
    endKmPlaceholder: 'e.g. 142820',
    endKmHelp: (startKm: number) => `Must be strictly greater than start reading (${startKm} KM)`,
    endKmError: (startKm: number) => `End KM must be greater than ${startKm} KM`,
    cashReceivedLabel: 'Total Cash Collected (₹ INR)',
    cashReceivedPlaceholder: 'e.g. 28000',
    tollsLabel: 'Tolls & Parking Expenses (₹ INR)',
    tollsPlaceholder: 'e.g. 1200',
    roadExpensesBreakdown: 'Road & Statutory Expenses Breakdown',
    tollBoxLabel: 'Toll Gate Charges (₹)',
    rtoBoxLabel: 'RTO & Permit Charges (₹)',
    parkingBoxLabel: 'Parking Fees (₹)',
    otherExpensesBoxLabel: 'Other Trip Expenses (₹)',
    totalRoadExpensesLabel: 'Total Road Expenses',
    livePnLSummary: 'Trip Financial Summary',
    totalDistance: 'Total Distance',
    fuelExpenses: 'Total Fuel',
    netProfit: 'Trip Net Profit',
    finishTripBtn: 'Finalize & Close Trip',
    finishing: 'Closing trip...',

    speechListening: 'Listening... speak clearly',
    speechTapToSpeak: 'Tap microphone to speak (Tamil or English)',
    speechDenied: 'Microphone permission denied in browser.',
    speechNotSupported: 'Speech recognition not supported on this browser.',

    // Driver Authentication & Bata Rule
    driverLoginHeading: 'Driver Cockpit Login',
    driverLoginSubheading: 'Sign in to access offline trip dispatch & telemetry logging',
    driverUsernameLabel: 'Driver Username',
    driverPasswordLabel: 'Driver Password',
    driverLoginBtn: 'Sign In to Driver Cockpit',
    driverLoggingIn: 'Signing in...',
    driverLogoutBtn: 'Sign Out',
    driverLoggedAs: (name: string) => `Logged in: ${name}`,
    ownerDriverBadge: 'Owner-Driver • Driver Bata: ₹0',
    hiredDriverBadge: 'Hired Driver',
    driverBataLabel: 'Driver Bata Allowance (₹ INR)',
    driverBataPlaceholder: 'e.g. 1200',
    driverBataOwnerZero: 'Owner-Driver Bata is ₹0 (enforced by FleetOS)',
    switchAccount: 'Switch Driver Account',
    invalidDriverCredentials: 'Invalid driver username or password',

    // Full Month Tamil Calendar
    fullMonthCalendarTitle: 'Monthly Tamil Fleet Calendar',
    openCalendarBtn: 'View Tamil Calendar & Bookings',
    closeCalendarBtn: 'Close Calendar',
    prevMonth: 'Previous Month',
    nextMonth: 'Next Month',
    tamilMonthLabel: 'Tamil Solar Month',
    nakshatraLabel: 'Nakshatra',
    tithiLabel: 'Tithi',
    addTourBtn: '+ Add Tour Booking',
    tourDetailsModalTitle: 'Tour Bookings on',
    dateSelectedLabel: (dateStr: string) => `Date: ${dateStr}`,
    tourTitleLabel: 'Tour Title / Group Name',
    tourCustomerLabel: 'Customer / Corporate Contact',
    tourDestinationLabel: 'Destination Route',
    tourPhoneLabel: 'Contact Phone Number',
    tourStartTimeLabel: 'Tour Start Time',
    tourEndTimeLabel: 'Tour End Time',
    tourStatusLabel: 'Booking Status',
    saveTourBookingBtn: 'Confirm & Schedule Booking',
    savingTourBooking: 'Scheduling booking...',
    auspiciousDayBadge: 'Subha Muhurtham / Auspicious',
    toursOnDate: (count: number) => `${count} ${count === 1 ? 'Tour' : 'Tours'} Scheduled`,

    // Multi-Day & Duration Calendar
    tourStartDateLabel: 'Start Date (Departure)',
    tourEndDateLabel: 'End Date (Return)',
    tourDurationLabel: 'Tour Duration (Days)',
    tourDurationDays: (days: number) => `${days} ${days === 1 ? 'Day' : 'Days'} Tour`,
    quickDurationSelect: 'Quick Duration',
    multiDayTourSummary: (days: number, start: string, end: string) => `${days}-Day Tour (${start} ➔ ${end})`,
    dayProgressBadge: (current: number, total: number) => `Day ${current} of ${total}`,
    noBookingsOnDate: 'No tour bookings scheduled on this date.',
    moreEventsCount: (count: number) => `+${count} more`,
    gcalSchemaLegend: 'Google Calendar API Color Schema:',
    multiDayTourLegend: 'Multi-Day Tour Span',
    cancelBtn: 'Cancel',
    customerContactLabel: 'Customer',
    routeLabel: 'Destination',
    phoneLabel: 'Phone',
    tourPlaceholder: 'e.g. Bangalore to Coorg Pilgrimage Tour',
    customerPlaceholder: 'e.g. Infosys Corp / Rajesh Sharma',
    tourDayIndicator: (day: number) => `Day ${day}`,
    calendarLegendTitle: 'Calendar Color Schema',

    // 5-Day Advance Tour Notifications
    advanceAlertsTitle: '5-Day Upcoming Tour Alerts',
    upcomingToursCount: (count: number) => `${count} upcoming ${count === 1 ? 'tour' : 'tours'} within 5 days`,
    upcomingTourInDays: (days: number, title: string) => `Tour in ${days} ${days === 1 ? 'day' : 'days'}: ${title}`,
    upcomingTourToday: (title: string) => `Tour Starting TODAY: ${title}`,
    upcomingTourTomorrow: (title: string) => `Tour Starting TOMORROW: ${title}`,
    enableNotificationsBtn: 'Enable Browser Alerts',
    notificationsEnabled: 'Browser Alerts Enabled',
    notificationBannerDismiss: 'Dismiss Alert',
    notificationBellTooltip: 'Upcoming tour reminders',

    // Drivers Management (Admin)
    driversManagementTitle: 'Driver Fleet Management',
    createDriverBtn: '+ Register New Driver',
    driverFullNameLabel: 'Full Name',
    isOwnerDriverCheckbox: 'Owner-Driver (Driver Bata ₹0 enforced)',
    driverCreatedSuccess: 'New driver login created successfully!',
    driverActiveStatus: 'Active Duty',
  },

  ta: {
    appName: 'Vinoth Travels',
    driverPwa: 'ஓட்டுநர் தளம்',
    adminPortal: 'நிர்வாக தளம்',
    busSubtitle: 'TN37aw6052 (23 இருக்கைகள்)',
    coachName: 'அசோக் லேலண்ட் லின்க்ஸ் டூரர்',
    scanQr: 'மொபைலில் திறக்க QR குறியீட்டை ஸ்கேன் செய்யவும்',

    langToggle: 'தமிழ் | EN',
    currentLangName: 'தமிழ்',

    onlineSynced: 'இணையம் உள்ளது • அனைத்தும் சேமிக்கப்பட்டது',
    offlineQueued: (count: number) => `ஆஃப்லைன் • ${count} பதிவுகள் காத்திருக்கின்றன`,
    syncing: 'ஒத்திசைக்கிறது...',
    forceSync: 'உடனடி சேமிப்பு',
    syncedAt: (time: string) => `சேமிக்கப்பட்டது ${time}`,

    tabTripStart: 'பயணம் தொடக்கம்',
    tabFuelStop: 'டீசல் பதிவு',
    tabTripEnd: 'பயணம் முடிவு',
    stepIndicator: (step: number, total: number) => `படி ${step} / ${total}`,

    tripSchedule: 'பயண அட்டவணை & முன்பதிவுகள்',
    tripScheduleDesc: 'முன்பதிவு செய்த இடத்தை தொட்டு தகவல்களை எளிதாக நிரப்பவும்',
    manualTripBtn: 'நேரடி / புதிய பயணம்',
    selectedSlotBadge: 'தேர்ந்தெடுக்கப்பட்ட முன்பதிவு',
    tapToSelect: 'தேர்வு செய்ய தொடவும்',
    todayLabel: 'இன்று',
    tomorrowLabel: 'நாளை',
    upcomingLabel: 'வரவிருக்கும் நாட்கள்',
    noSlotsFound: 'இந்த காலகட்டத்திற்கு முன்பதிவுகள் எதுவும் இல்லை',
    slotConfirmed: 'உறுதி செய்யப்பட்டது',
    slotPending: 'விசாரணை',
    slotMaintenance: 'பராமரிப்பு பணி',
    clearSlot: 'முன்பதிவை நீக்கு',

    activeTripWarning: 'ஏற்கனவே ஒரு பயணம் நடப்பில் உள்ளது. அதை முடிக்கவும் அல்லது டீசல் பதியவும்.',
    startTripHeading: 'புதிய பயணத்தை தொடங்கவும்',
    startTripSubheading: 'பயணம் தொடங்கும் முன் கிலோமீட்டர் மற்றும் முன்பதிவு விவரங்களை உள்ளிடவும்',
    customerNameLabel: 'வாடிக்கையாளர் / நிறுவனத்தின் பெயர்',
    customerNamePlaceholder: 'எ.கா: இன்ஃபோசிஸ் / ராஜேஷ்',
    destinationLabel: 'செல்லும் இடம் / பாதை',
    destinationPlaceholder: 'எ.கா: பெங்களூரு முதல் கூர்க் வரை',
    startKmLabel: 'தொடக்க கிலோமீட்டர் (KM)',
    startKmPlaceholder: 'எ.கா: 142380',
    startKmHelp: 'வாகனத்தை எடுக்கும் முன் மீட்டரில் உள்ள ரீடிங்கை சரிபார்க்கவும்',
    startTripBtn: 'பயணத்தை தொடங்கவும்',
    smartAutoFillHint: 'இன்றைய உறுதி செய்யப்பட்ட முன்பதிவு கண்டறியப்பட்டது',

    activeTripLabel: 'நடப்பு பயணம்',
    currentTripRoute: 'நடப்பு பாதை',
    fuelStopHeading: 'டீசல் நிரப்புதல் பதிவு',
    fuelStopSubheading: 'டீசல் தொகையை உள்ளிட்டு ரசீது புகைப்படத்தை இணைக்கவும்',
    fuelAmountLabel: 'டீசல் தொகை (₹ ரூபாய்)',
    fuelAmountPlaceholder: 'எ.கா: 4500',
    fuelLitersLabel: 'டீசல் அளவு (லிட்டர்கள் - விருப்பத்தேர்வு)',
    fuelLitersPlaceholder: 'எ.கா: 50.2',
    fuelBillPhotoLabel: 'டீசல் ரசீது புகைப்படம்',
    tapToCaptureBill: 'டீசல் பில் புகைப்படம் எடுக்க தொடவும்',
    billCaptured: 'ரசீது புகைப்படம் எடுக்கப்பட்டு சேமிக்கப்பட்டது',
    retakeBill: 'மீண்டும் புகைப்படம் எடுக்கவும்',
    compressingImage: 'புகைப்படம் சுருக்கப்படுகிறது...',
    logFuelBtn: 'டீசல் விவரங்களை சேமிக்கவும்',
    skipToFinish: 'பயணத்தை முடிக்க செல்லவும்',
    loggedReceiptsTitle: 'இந்த பயணத்தில் பதியப்பட்ட டீசல் பில்கள்',
    noReceiptsYet: 'இந்த பயணத்திற்கு இதுவரை டீசல் பில்கள் எதுவும் பதியப்படவில்லை.',

    finishTripHeading: 'பயணத்தை முடித்து கணக்கை முடிக்கவும்',
    finishTripSubheading: 'இறுதி கிலோமீட்டர், பெறப்பட்ட ரொக்கம் மற்றும் சுங்க கட்டணங்களை உள்ளிடவும்',
    endKmLabel: 'முடிவு கிலோமீட்டர் (KM)',
    endKmPlaceholder: 'எ.கா: 142820',
    endKmHelp: (startKm: number) => `தொடக்க ரீடிங்கை விட (${startKm} KM) அதிகமாக இருக்க வேண்டும்`,
    endKmError: (startKm: number) => `முடிவு கிலோமீட்டர் ${startKm} KM ஐ விட அதிகமாக இருக்க வேண்டும்`,
    cashReceivedLabel: 'வாடிக்கையாளரிடம் பெறப்பட்ட பணம் (₹ ரூபாய்)',
    cashReceivedPlaceholder: 'எ.கா: 28000',
    tollsLabel: 'சுங்கச்சாவடி (டோல்) & பார்க்கிங் செலவுகள் (₹)',
    tollsPlaceholder: 'எ.கா: 1200',
    roadExpensesBreakdown: 'சாலை மற்றும் பிற செலவுகள் விவரம்',
    tollBoxLabel: 'சுங்கக் கட்டணம் - டோல்கேட் (₹)',
    rtoBoxLabel: 'RTO & அனுமதி வரி கட்டணம் (₹)',
    parkingBoxLabel: 'பார்க்கிங் கட்டணம் (₹)',
    otherExpensesBoxLabel: 'இதர பயணச் செலவுகள் (₹)',
    totalRoadExpensesLabel: 'மொத்த சாலைச் செலவுகள்',
    livePnLSummary: 'பயணத்தின் நிதி சுருக்கம்',
    totalDistance: 'மொத்த தூரம்',
    fuelExpenses: 'மொத்த டீசல் செலவு',
    netProfit: 'நிகர லாபம்',
    finishTripBtn: 'பயணத்தை நிறைவு செய்யவும்',
    finishing: 'பயணம் முடிக்கப்படுகிறது...',

    speechListening: 'கேட்கிறது... தெளிவாக பேசவும்',
    speechTapToSpeak: 'பேசி உள்ளிட மைக்ரோஃபோனைத் தொடவும் (தமிழ் அல்லது English)',
    speechDenied: 'பிரவுசரில் மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது.',
    speechNotSupported: 'இந்த பிரவுசரில் குரல் வழி உள்ளீடு ஆதரிக்கப்படவில்லை.',

    // Driver Authentication & Bata Rule
    driverLoginHeading: 'ஓட்டுநர் உள்நுழைவு',
    driverLoginSubheading: 'பயண பதிவுகளை மேற்கொள்ள உங்கள் பயனர் கணக்கில் நுழையவும்',
    driverUsernameLabel: 'ஓட்டுநர் பயனர் பெயர்',
    driverPasswordLabel: 'கடவுச்சொல்',
    driverLoginBtn: 'உள்நுழைக',
    driverLoggingIn: 'உள்நுழைகிறது...',
    driverLogoutBtn: 'வெளியேறு',
    driverLoggedAs: (name: string) => `ஓட்டுநர்: ${name}`,
    ownerDriverBadge: 'உரிமையாளர் ஓட்டுநர் • படி: ₹0',
    hiredDriverBadge: 'வாடகை ஓட்டுநர்',
    driverBataLabel: 'ஓட்டுநர் படி / பேட்டா (₹ ரூபாய்)',
    driverBataPlaceholder: 'எ.கா: 1200',
    driverBataOwnerZero: 'உரிமையாளர் ஓட்டுநருக்கு படி ₹0 (FleetOS விதி)',
    switchAccount: 'கணக்கை மாற்றவும்',
    invalidDriverCredentials: 'தவறான பயனர் பெயர் அல்லது கடவுச்சொல்',

    // Full Month Tamil Calendar
    fullMonthCalendarTitle: 'முழு மாத தமிழ் காலண்டர் & முன்பதிவுகள்',
    openCalendarBtn: 'தமிழ் காலண்டர் & முன்பதிவுகள் காண்க',
    closeCalendarBtn: 'காலண்டரை மூடு',
    prevMonth: 'முந்தைய மாதம்',
    nextMonth: 'அடுத்த மாதம்',
    tamilMonthLabel: 'தமிழ் மாதம்',
    nakshatraLabel: 'நட்சத்திரம்',
    tithiLabel: 'திதி',
    addTourBtn: '+ புதிய டூர் முன்பதிவு சேர்க்க',
    tourDetailsModalTitle: 'முன்பதிவு விவரங்கள்',
    dateSelectedLabel: (dateStr: string) => `தேதி: ${dateStr}`,
    tourTitleLabel: 'டூர் தலைப்பு / குழு பெயர்',
    tourCustomerLabel: 'வாடிக்கையாளர் / நிறுவன தொடர்பு',
    tourDestinationLabel: 'செல்லும் பாதை / இடம்',
    tourPhoneLabel: 'தொடர்பு தொலைபேசி எண்',
    tourStartTimeLabel: 'தொடங்கும் நேரம்',
    tourEndTimeLabel: 'முடிவடையும் நேரம்',
    tourStatusLabel: 'முன்பதிவு நிலை',
    saveTourBookingBtn: 'முன்பதிவை உறுதி செய்',
    savingTourBooking: 'முன்பதிவு செய்யப்படுகிறது...',
    auspiciousDayBadge: 'சுப முகூர்த்தம் / நல்ல நாள்',
    toursOnDate: (count: number) => `${count} ${count === 1 ? 'பயணம்' : 'பயணங்கள்'} திட்டமிடப்பட்டுள்ளது`,

    // Multi-Day & Duration Calendar
    tourStartDateLabel: 'தொடக்கத் தேதி (புறப்பாடு)',
    tourEndDateLabel: 'முடிவுத் தேதி (திரும்புதல்)',
    tourDurationLabel: 'பயண நாட்கள் (கால அளவு)',
    tourDurationDays: (days: number) => `${days} ${days === 1 ? 'நாள்' : 'நாட்கள்'} பயணம்`,
    quickDurationSelect: 'விரைவு நாட்கள் தேர்வு',
    multiDayTourSummary: (days: number, start: string, end: string) => `${days} நாள் பயணம் (${start} ➔ ${end})`,
    dayProgressBadge: (current: number, total: number) => `நாள் ${current} / ${total}`,
    noBookingsOnDate: 'இந்த தேதியில் பயண முன்பதிவுகள் எதுவும் இல்லை.',
    moreEventsCount: (count: number) => `+${count} மேலும்`,
    gcalSchemaLegend: 'கூகுள் காலண்டர் வண்ண குறியீடுகள்:',
    multiDayTourLegend: 'பல நாள் பயணம்',
    cancelBtn: 'ரத்து செய்',
    customerContactLabel: 'வாடிக்கையாளர்',
    routeLabel: 'செல்லும் பாதை',
    phoneLabel: 'தொலைபேசி',
    tourPlaceholder: 'எ.கா: பெங்களூர் - கூர்க் சுற்றுலா பயணம்',
    customerPlaceholder: 'எ.கா: இன்போசிஸ் கார்ப்பரேஷன் / ராஜேஷ்',
    tourDayIndicator: (day: number) => `நாள் ${day}`,
    calendarLegendTitle: 'காலண்டர் வண்ண விளக்கம்',

    // 5-Day Advance Tour Notifications
    advanceAlertsTitle: '5 நாள் வரவிருக்கும் டூர் எச்சரிக்கைகள்',
    upcomingToursCount: (count: number) => `அடுத்த 5 நாட்களில் ${count} ${count === 1 ? 'பயணம்' : 'பயணங்கள்'} உள்ளன`,
    upcomingTourInDays: (days: number, title: string) => `இன்னும் ${days} ${days === 1 ? 'நாளில்' : 'நாட்களில்'} பயணம்: ${title}`,
    upcomingTourToday: (title: string) => `இன்று தொடங்கும் பயணம்: ${title}`,
    upcomingTourTomorrow: (title: string) => `நாளை தொடங்கும் பயணம்: ${title}`,
    enableNotificationsBtn: 'அறிவிப்புகளை இயக்கவும்',
    notificationsEnabled: 'அறிவிப்புகள் இயக்கப்பட்டுள்ளன',
    notificationBannerDismiss: 'அறிவிப்பை மூடு',
    notificationBellTooltip: 'வரவிருக்கும் பயண நினைவூட்டல்கள்',

    // Drivers Management (Admin)
    driversManagementTitle: 'ஓட்டுநர் மேலாண்மை',
    createDriverBtn: '+ புதிய ஓட்டுநரை பதிவு செய்க',
    driverFullNameLabel: 'முழு பெயர்',
    isOwnerDriverCheckbox: 'உரிமையாளர் ஓட்டுநர் (படி ₹0 செயல்படுத்தப்படும்)',
    driverCreatedSuccess: 'புதிய ஓட்டுநர் வெற்றிகரமாக பதிவு செய்யப்பட்டார்!',
    driverActiveStatus: 'பணியில் உள்ளார்',
  },
};
