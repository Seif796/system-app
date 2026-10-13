/**
 * نظام توثيق المشاكل الذكي (iOS & Android)
 * شاشة سوداء مع زر أزرق نيون مضيء
 * ترقيم تلقائي للصور + سحب اللوكيشن GPS + تحديد حالة المشكلة
 * كشف اسم الجهاز (iPhone / Android) + إشعارات فورية
 * العمل الكامل بدون إنترنت (Offline Mode) + مزامنة ورفع تلقائي بمجرد الاتصال بالإنترنت والواي فاي
 */

// ==================== STATE MANAGEMENT ====================
const DB_KEY = 'system_reports_db_v1';
const ROOM_KEY = 'system_sync_room_id';
const DEVICE_NAME_KEY = 'system_device_name_v1';
const DEVICE_ID_KEY = 'system_device_id_v1';
const DEFAULT_ROOM = 'SYSTEM-MAIN';

let state = {
  reports: [],
  currentPhotoData: null,
  currentLocation: null,
  activeFilter: 'all',
  syncRoom: localStorage.getItem(ROOM_KEY) || DEFAULT_ROOM,
  deviceId: getOrCreateDeviceId(),
  deviceName: getInitialDeviceName(),
  deferredInstallPrompt: null,
  eventSource: null,
  currentViewingReportId: null,
  isSyncingPending: false
};

// ==================== DOM ELEMENTS ====================
const takePhotoBtn = document.getElementById('takePhotoBtn');
const cameraInput = document.getElementById('cameraInput');
const nextNumberLabel = document.getElementById('nextNumberLabel');
const reportCountBadge = document.getElementById('reportCountBadge');
const roomLabel = document.getElementById('roomLabel');
const currentDeviceLabel = document.getElementById('currentDeviceLabel');
const currentDeviceIcon = document.getElementById('currentDeviceIcon');

// Network & Offline Status
const networkStatusBar = document.getElementById('networkStatusBar');
const netStatusIcon = document.getElementById('netStatusIcon');
const netStatusText = document.getElementById('netStatusText');
const pendingSyncPill = document.getElementById('pendingSyncPill');
const pendingSyncLabel = document.getElementById('pendingSyncLabel');

// Floating In-App Notification
const inAppNotification = document.getElementById('inAppNotification');
const notifTitle = document.getElementById('notifTitle');
const notifMeta = document.getElementById('notifMeta');
const notifThumbBox = document.getElementById('notifThumbBox');
const notifThumbImg = document.getElementById('notifThumbImg');

// Report Creation Modal
const reportModal = document.getElementById('reportModal');
const modalPhotoNumber = document.getElementById('modalPhotoNumber');
const modalDeviceTag = document.getElementById('modalDeviceTag');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const retakePhotoBtn = document.getElementById('retakePhotoBtn');
const problemNotes = document.getElementById('problemNotes');
const locationStatus = document.getElementById('locationStatus');
const locationDetails = document.getElementById('locationDetails');
const latVal = document.getElementById('latVal');
const lngVal = document.getElementById('lngVal');
const addressVal = document.getElementById('addressVal');
const mapLinkBtn = document.getElementById('mapLinkBtn');
const refreshLocationBtn = document.getElementById('refreshLocationBtn');
const saveReportBtn = document.getElementById('saveReportBtn');
const cancelReportBtn = document.getElementById('cancelReportBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalOverlay = document.getElementById('modalOverlay');

// Report Details Viewer Modal
const detailModal = document.getElementById('detailModal');
const detailModalOverlay = document.getElementById('detailModalOverlay');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailPhotoNum = document.getElementById('detailPhotoNum');
const detailDeviceName = document.getElementById('detailDeviceName');
const detailPhotoImg = document.getElementById('detailPhotoImg');
const detailStatusPill = document.getElementById('detailStatusPill');
const detailStatusDot = document.getElementById('detailStatusDot');
const detailStatusText = document.getElementById('detailStatusText');
const detailNotesText = document.getElementById('detailNotesText');
const detailAddress = document.getElementById('detailAddress');
const detailMapLink = document.getElementById('detailMapLink');
const detailTime = document.getElementById('detailTime');
const detailToggleStatusBtn = document.getElementById('detailToggleStatusBtn');

// List Modal
const viewListBtn = document.getElementById('viewListBtn');
const listModal = document.getElementById('listModal');
const closeListModalBtn = document.getElementById('closeListModalBtn');
const listModalOverlay = document.getElementById('listModalOverlay');
const reportsContainer = document.getElementById('reportsContainer');
const emptyState = document.getElementById('emptyState');
const listCountBadge = document.getElementById('listCountBadge');
const countAll = document.getElementById('countAll');
const countUnresolved = document.getElementById('countUnresolved');
const countResolved = document.getElementById('countResolved');
const filterChips = document.querySelectorAll('.filter-chip');

// Sync Modal
const syncModalBtn = document.getElementById('syncModalBtn');
const syncModal = document.getElementById('syncModal');
const closeSyncModalBtn = document.getElementById('closeSyncModalBtn');
const syncModalOverlay = document.getElementById('syncModalOverlay');
const roomCodeInput = document.getElementById('roomCodeInput');
const generateRoomBtn = document.getElementById('generateRoomBtn');
const applyRoomBtn = document.getElementById('applyRoomBtn');
const deviceNameInput = document.getElementById('deviceNameInput');
const saveDeviceNameBtn = document.getElementById('saveDeviceNameBtn');
const enableNotifBtn = document.getElementById('enableNotifBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');
const cloudStatusText = document.getElementById('cloudStatusText');
const syncStatusDot = document.getElementById('syncStatusDot');

// Install Modal
const installAppBtn = document.getElementById('installAppBtn');
const installModal = document.getElementById('installModal');
const closeInstallModalBtn = document.getElementById('closeInstallModalBtn');
const installModalOverlay = document.getElementById('installModalOverlay');
const directInstallBtn = document.getElementById('directInstallBtn');
const androidDirectInstall = document.getElementById('androidDirectInstall');
const installTabs = document.querySelectorAll('.install-tab');

// Toast
const toast = document.getElementById('toast');

// ==================== DEVICE DETECTION ====================
function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getInitialDeviceName() {
  const custom = localStorage.getItem(DEVICE_NAME_KEY);
  if (custom && custom.trim()) return custom.trim();

  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iPhone 🍏';
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android[^;]+; ([^;)]+)/);
    if (match && match[1]) {
      return `Android (${match[1].trim()}) 🤖`;
    }
    return 'Android 🤖';
  } else if (/Windows/.test(ua)) {
    return 'Windows PC 💻';
  } else if (/Macintosh/.test(ua)) {
    return 'Mac 🖥️';
  }
  return 'هاتف ذكي 📱';
}

function updateDeviceDisplay() {
  currentDeviceLabel.textContent = state.deviceName;
  modalDeviceTag.textContent = state.deviceName;
  if (state.deviceName.includes('iPhone')) {
    currentDeviceIcon.textContent = '🍏';
  } else if (state.deviceName.includes('Android')) {
    currentDeviceIcon.textContent = '🤖';
  } else {
    currentDeviceIcon.textContent = '📱';
  }
}

// ==================== INITIALIZATION ====================
function initApp() {
  try {
    loadReportsFromStorage();
    checkUrlParams();
    updateDeviceDisplay();
    updateUI();
    setupEventListeners();
    initServiceWorker();
    initNetworkListeners();
    initRealtimeCloud();
  } catch (err) {
    console.error('App init error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Check if room code was passed via URL (e.g. ?room=ROOM123)
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam && roomParam.trim()) {
    state.syncRoom = roomParam.trim().toUpperCase();
    localStorage.setItem(ROOM_KEY, state.syncRoom);
  }
}

// Load reports from LocalStorage
function loadReportsFromStorage() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      state.reports = JSON.parse(raw);
    } else {
      state.reports = [];
    }
  } catch (err) {
    console.error('Error loading reports:', err);
    state.reports = [];
  }
}

// Save reports to LocalStorage
function saveReportsToStorage() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state.reports));
    updateUI();
  } catch (err) {
    console.error('Storage quota exceeded:', err);
    showToast('تنبيه: سعة التخزين قاربت على الامتلاء');
  }
}

// Get the next sequence number (1, 2, 3...)
function getNextSequenceNumber() {
  if (!state.reports || state.reports.length === 0) return 1;
  const maxNum = state.reports.reduce((max, r) => Math.max(max, r.sequenceNumber || 0), 0);
  return maxNum + 1;
}

// Update UI Badges & Next Number Text & Pending Sync
function updateUI() {
  const nextNum = getNextSequenceNumber();
  nextNumberLabel.textContent = `صورة رقم ${nextNum}`;
  reportCountBadge.textContent = state.reports.length;
  listCountBadge.textContent = `${state.reports.length} بلاغ`;
  roomLabel.textContent = `الغرفة: ${state.syncRoom}`;

  const resolvedCount = state.reports.filter(r => r.status === 'resolved').length;
  const unresolvedCount = state.reports.filter(r => r.status === 'unresolved').length;

  countAll.textContent = state.reports.length;
  countResolved.textContent = resolvedCount;
  countUnresolved.textContent = unresolvedCount;

  // Pending Offline Queue Indicator
  const pendingCount = state.reports.filter(r => r.synced === false).length;
  if (pendingCount > 0) {
    pendingSyncPill.style.display = 'flex';
    pendingSyncLabel.textContent = `${pendingCount} بلاغات محفوظة محلياً (بانتظار الإنترنت)`;
  } else {
    pendingSyncPill.style.display = 'none';
  }
}

// ==================== OFFLINE & AUTO-SYNC NETWORK SYSTEM ====================
function initNetworkListeners() {
  updateNetworkStatus();

  window.addEventListener('online', () => {
    updateNetworkStatus();
    syncPendingReports();
  });

  window.addEventListener('offline', () => {
    updateNetworkStatus();
  });

  // Periodic check: sync whenever online if there are pending reports
  setInterval(() => {
    if (navigator.onLine && !state.isSyncingPending) {
      const hasPending = state.reports.some(r => r.synced === false);
      if (hasPending) {
        syncPendingReports();
      }
    }
  }, 15000);
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  const pendingCount = state.reports.filter(r => r.synced === false).length;

  if (!isOnline) {
    networkStatusBar.className = 'network-status-bar offline';
    networkStatusBar.style.display = 'flex';
    netStatusIcon.textContent = '📶';
    netStatusText.textContent = 'وضع عدم الاتصال (بدون إنترنت) - سيتم حفظ البلاغات محلياً ورفعها تلقائياً عند الاتصال بالواي فاي';
    syncStatusDot.style.backgroundColor = '#ff3366';
    cloudStatusText.textContent = 'غير متصل (الوضع غير متصل نشط)';
  } else {
    if (pendingCount > 0 && !state.isSyncingPending) {
      networkStatusBar.className = 'network-status-bar syncing';
      networkStatusBar.style.display = 'flex';
      netStatusIcon.textContent = '🔄';
      netStatusText.textContent = `متصل بالإنترنت! جاري رفع ${pendingCount} بلاغ محفوظ...`;
    } else if (!state.isSyncingPending) {
      networkStatusBar.style.display = 'none';
      syncStatusDot.style.backgroundColor = '#00e676';
      cloudStatusText.textContent = `متصل في الوقت الفعلي (${state.syncRoom})`;
    }
  }
}

// Synchronize all pending offline reports when returning home / connecting to Wi-Fi
async function syncPendingReports() {
  if (state.isSyncingPending || !navigator.onLine) return;

  const pending = state.reports.filter(r => r.synced === false);
  if (pending.length === 0) return;

  state.isSyncingPending = true;
  networkStatusBar.className = 'network-status-bar syncing';
  networkStatusBar.style.display = 'flex';
  netStatusIcon.textContent = '🔄';
  netStatusText.textContent = `تم الاتصال بالإنترنت! جاري رفع ومزامنة ${pending.length} بلاغ إلى النظام...`;

  let successCount = 0;

  for (const report of pending) {
    try {
      // 1. If GPS address was not resolved offline, resolve it now
      if (report.location && report.location.lat !== 0 && (!report.location.address || report.location.address.includes('سيتم تحديد'))) {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${report.location.lat}&lon=${report.location.lng}&accept-language=ar`,
            { headers: { 'User-Agent': 'SystemReportApp/1.0' } }
          );
          if (resp.ok) {
            const geoData = await resp.json();
            if (geoData.display_name) {
              report.location.address = geoData.display_name;
            }
          }
        } catch (e) {}
      }

      // 2. Publish to cloud
      await publishReportToCloudAsync(report);
      report.synced = true;
      successCount++;
    } catch (err) {
      console.warn('Failed to sync report:', report.id, err);
    }
  }

  state.isSyncingPending = false;
  saveReportsToStorage();
  updateUI();

  if (successCount > 0) {
    networkStatusBar.className = 'network-status-bar online-success';
    netStatusIcon.textContent = '✅';
    netStatusText.textContent = `تم بنجاح رفع ومزامنة ${successCount} بلاغ إلى النظام!`;
    playChimeSound();
    showToast(`🎉 تم الاتصال بالإنترنت ومزامنة ${successCount} بلاغ تلقائياً!`);

    setTimeout(() => {
      networkStatusBar.style.display = 'none';
    }, 4500);
  }
}

// ==================== AUDIO & NOTIFICATION SYSTEM ====================
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12); // D6

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Audio context might be restricted before user interaction
  }
}

function triggerNewOperationNotification(report) {
  // 1. Play Chime & Vibrate
  playChimeSound();
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  // 2. In-App Floating Notification Banner
  const deviceName = report.device || 'جهاز آخر';
  const statusLabel = report.status === 'resolved' ? 'تم الحل ✅' : 'لم تُحل بعد ❌';

  notifTitle.textContent = `عملية جديدة مضافة من ${deviceName}!`;
  notifMeta.textContent = `صورة رقم ${report.sequenceNumber} • ${statusLabel}`;

  if (report.photo) {
    notifThumbImg.src = report.photo;
    notifThumbBox.style.display = 'block';
  } else {
    notifThumbBox.style.display = 'none';
  }

  inAppNotification.classList.add('show');

  inAppNotification.onclick = () => {
    inAppNotification.classList.remove('show');
    openReportDetails(report.id);
  };

  setTimeout(() => {
    inAppNotification.classList.remove('show');
  }, 7000);

  // 3. System Native Notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(`عملية جديدة مضافة من ${deviceName}!`, {
        body: `صورة رقم ${report.sequenceNumber} • الحالة: ${statusLabel}\nاضغط هنا لمعاينة البلاغ والصورة وموقعه`,
        icon: 'icons/icon-192.png',
        badge: 'icons/favicon.png',
        tag: 'system_report_' + report.id
      });

      notif.onclick = () => {
        window.focus();
        openReportDetails(report.id);
      };
    } catch (e) {
      console.warn('Native notification failed:', e);
    }
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // 1. Neon Plus Button triggers Camera
  takePhotoBtn.addEventListener('click', () => {
    cameraInput.value = '';
    cameraInput.click();
  });

  cameraInput.addEventListener('change', handlePhotoSelection);

  // Retake photo
  retakePhotoBtn.addEventListener('click', () => {
    cameraInput.value = '';
    cameraInput.click();
  });

  // Save report
  saveReportBtn.addEventListener('click', saveCurrentReport);

  // Close / Cancel Report Creation Modal
  cancelReportBtn.addEventListener('click', closeReportModal);
  closeModalBtn.addEventListener('click', closeReportModal);
  modalOverlay.addEventListener('click', closeReportModal);

  // Refresh Location in Modal
  refreshLocationBtn.addEventListener('click', fetchCurrentLocation);

  // 2. Reports List Modal
  viewListBtn.addEventListener('click', () => {
    renderReportsList();
    openModal(listModal);
  });
  closeListModalBtn.addEventListener('click', () => closeModal(listModal));
  listModalOverlay.addEventListener('click', () => closeModal(listModal));

  // Filters
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderReportsList();
    });
  });

  // 3. Report Details Modal
  closeDetailModalBtn.addEventListener('click', () => closeModal(detailModal));
  detailCloseBtn.addEventListener('click', () => closeModal(detailModal));
  detailModalOverlay.addEventListener('click', () => closeModal(detailModal));

  detailToggleStatusBtn.addEventListener('click', () => {
    if (state.currentViewingReportId) {
      toggleReportStatus(state.currentViewingReportId);
      openReportDetails(state.currentViewingReportId);
    }
  });

  // 4. Sync & Device Settings Modal
  syncModalBtn.addEventListener('click', () => {
    roomCodeInput.value = state.syncRoom;
    deviceNameInput.value = state.deviceName;
    openModal(syncModal);
  });
  closeSyncModalBtn.addEventListener('click', () => closeModal(syncModal));
  syncModalOverlay.addEventListener('click', () => closeModal(syncModal));

  saveDeviceNameBtn.addEventListener('click', () => {
    const customName = deviceNameInput.value.trim();
    if (customName) {
      state.deviceName = customName;
      localStorage.setItem(DEVICE_NAME_KEY, customName);
      updateDeviceDisplay();
      showToast(`تم حفظ اسم الجهاز: ${customName}`);
    }
  });

  enableNotifBtn.addEventListener('click', async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('تم تفعيل إشعارات الهاتف بنجاح! 🔔');
      } else {
        showToast('يرجى السماح بالإشعارات من إعدادات المتصفح');
      }
    } else {
      showToast('المتصفح يدعم الإشعارات التفاعلية الداخلية');
    }
  });

  generateRoomBtn.addEventListener('click', () => {
    const randomCode = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
    roomCodeInput.value = randomCode;
  });

  applyRoomBtn.addEventListener('click', () => {
    const newRoom = roomCodeInput.value.trim().toUpperCase() || DEFAULT_ROOM;
    state.syncRoom = newRoom;
    localStorage.setItem(ROOM_KEY, newRoom);
    updateUI();
    closeModal(syncModal);
    initRealtimeCloud();
    showToast(`تم ضبط غرفة المزامنة: ${newRoom}`);
  });

  exportDataBtn.addEventListener('click', exportReportsAsJson);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportFile);

  // 5. Install Guide Modal
  installAppBtn.addEventListener('click', () => {
    openModal(installModal);
  });
  closeInstallModalBtn.addEventListener('click', () => closeModal(installModal));
  installModalOverlay.addEventListener('click', () => closeModal(installModal));

  installTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      installTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('iosGuide').classList.toggle('active', target === 'ios');
      document.getElementById('androidGuide').classList.toggle('active', target === 'android');
    });
  });

  // Direct PWA Install prompt on Android
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.deferredInstallPrompt = e;
    androidDirectInstall.style.display = 'block';
  });

  if (directInstallBtn) {
    directInstallBtn.addEventListener('click', async () => {
      if (state.deferredInstallPrompt) {
        state.deferredInstallPrompt.prompt();
        const choice = await state.deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          showToast('جاري تثبيت التطبيق...');
        }
        state.deferredInstallPrompt = null;
        closeModal(installModal);
      }
    });
  }
}

// ==================== PHOTO & GEOLOCATION (OFFLINE READY) ====================
async function handlePhotoSelection(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  showToast('جاري معالجة الصورة وتحديد الموقع...');

  try {
    const compressedBase64 = await compressImage(file, 1200, 0.75);
    state.currentPhotoData = compressedBase64;
    photoPreviewImg.src = compressedBase64;

    const nextNum = getNextSequenceNumber();
    modalPhotoNumber.textContent = `صورة رقم ${nextNum}`;
    modalDeviceTag.textContent = state.deviceName;

    problemNotes.value = '';
    document.querySelector('input[name="problemStatus"][value="unresolved"]').checked = true;

    openModal(reportModal);
    fetchCurrentLocation();
  } catch (err) {
    console.error('Image compression error:', err);
    showToast('حدث خطأ أثناء معالجة الصورة');
  }
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      image.onerror = reject;
      image.src = readerEvent.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// GPS Geolocation - Works 100% Offline via Satellite Hardware
function fetchCurrentLocation() {
  locationStatus.style.display = 'flex';
  locationDetails.style.display = 'none';

  if (!navigator.geolocation) {
    locationStatus.innerHTML = '<span>⚠️ تحديد الموقع غير مدعوم في جهازك</span>';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const isOnline = navigator.onLine;

      state.currentLocation = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        address: isOnline ? 'جاري تحديد اسم المنطقة...' : `إحداثيات GPS بدقة ±${Math.round(accuracy)}م (سيتم تحديد اسم الشارع عند الاتصال)`,
        mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
      };

      latVal.textContent = latitude.toFixed(5);
      lngVal.textContent = longitude.toFixed(5);
      mapLinkBtn.href = state.currentLocation.mapUrl;
      addressVal.textContent = state.currentLocation.address;

      locationStatus.style.display = 'none';
      locationDetails.style.display = 'block';

      // Reverse geocode if online
      if (isOnline) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`,
            { headers: { 'User-Agent': 'SystemReportApp/1.0' } }
          );
          if (response.ok) {
            const data = await response.json();
            const displayAddress = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            state.currentLocation.address = displayAddress;
            addressVal.textContent = displayAddress;
          }
        } catch (e) {
          // Keep satellite coordinates
        }
      }
    },
    (error) => {
      console.warn('Geolocation error:', error);
      let errMsg = 'تعذر الحصول على الموقع (يرجى تفعيل GPS وإعطاء الإذن)';
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = 'تم رفض إذن الوصول للموقع، يرجى تفعيله من إعدادات الهاتف';
      }
      locationStatus.innerHTML = `<span>⚠️ ${errMsg}</span>`;
      state.currentLocation = {
        lat: 0,
        lng: 0,
        accuracy: 0,
        address: 'الموقع غير متوفر',
        mapUrl: '#'
      };
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

// ==================== SAVE REPORT (OFFLINE / ONLINE) ====================
function saveCurrentReport() {
  if (!state.currentPhotoData) {
    showToast('يرجى التقاط صورة أولاً');
    return;
  }

  const selectedStatus = document.querySelector('input[name="problemStatus"]:checked').value;
  const notes = problemNotes.value.trim();
  const seqNum = getNextSequenceNumber();
  const isOnline = navigator.onLine;

  const newReport = {
    id: 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    sequenceNumber: seqNum,
    photo: state.currentPhotoData,
    status: selectedStatus, // 'resolved' or 'unresolved'
    notes: notes,
    location: state.currentLocation || {
      lat: 0,
      lng: 0,
      accuracy: 0,
      address: 'لم يتم تحديد موقع',
      mapUrl: '#'
    },
    device: state.deviceName,
    deviceId: state.deviceId,
    timestamp: new Date().toISOString(),
    displayDate: new Date().toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    room: state.syncRoom,
    synced: isOnline // true if online and published, false if offline
  };

  // Add to beginning of local reports list
  state.reports.unshift(newReport);
  saveReportsToStorage();

  closeReportModal();

  if (isOnline) {
    publishReportToCloud(newReport);
    showToast(`✅ تم حفظ ونشر "صورة رقم ${seqNum}" بواسطة ${state.deviceName}!`);
  } else {
    // Saved Offline!
    updateUI();
    showToast(`💾 تم حفظ "صورة رقم ${seqNum}" محلياً (سيتم رفعها تلقائياً عند الاتصال بالإنترنت)`);
  }
}

function closeReportModal() {
  closeModal(reportModal);
  state.currentPhotoData = null;
  state.currentLocation = null;
}

// ==================== DETAILS VIEWER MODAL ====================
window.openReportDetails = function(reportId) {
  const report = state.reports.find(r => r.id === reportId);
  if (!report) return;

  state.currentViewingReportId = report.id;

  detailPhotoNum.textContent = `صورة رقم ${report.sequenceNumber}`;
  const syncLabel = (report.synced === false) ? ' [⏳ محفوظ محلياً]' : ' [☁️ متزامن]';
  detailDeviceName.textContent = (report.device || 'جهاز غير معروف') + syncLabel;
  detailPhotoImg.src = report.photo;

  const isResolved = report.status === 'resolved';
  detailStatusPill.className = `detail-status-pill ${report.status}`;
  detailStatusText.textContent = isResolved ? 'تم الحل ✅' : 'لم تُحل بعد ❌';

  detailNotesText.textContent = report.notes ? report.notes : 'لا توجد ملاحظات إضافية مسجلة.';

  if (report.location && report.location.lat !== 0) {
    detailAddress.textContent = report.location.address || 'إحداثيات مسجلة';
    detailMapLink.href = report.location.mapUrl || `https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`;
    detailMapLink.style.display = 'inline-flex';
  } else {
    detailAddress.textContent = 'الموقع غير متوفر';
    detailMapLink.style.display = 'none';
  }

  detailTime.textContent = report.displayDate || 'غير محدد';
  detailToggleStatusBtn.textContent = isResolved ? 'تغيير الحالة إلى: لم تُحل ❌' : 'تغيير الحالة إلى: تم الحل ✅';

  openModal(detailModal);
};

// ==================== RENDER REPORTS LIST ====================
function renderReportsList() {
  reportsContainer.innerHTML = '';

  const filtered = state.reports.filter(r => {
    if (state.activeFilter === 'resolved') return r.status === 'resolved';
    if (state.activeFilter === 'unresolved') return r.status === 'unresolved';
    return true;
  });

  if (filtered.length === 0) {
    reportsContainer.appendChild(emptyState);
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  filtered.forEach(report => {
    const card = document.createElement('div');
    card.className = `report-card status-${report.status}`;

    const isResolved = report.status === 'resolved';
    const statusText = isResolved ? '✅ تم الحل' : '❌ لم تُحل بعد';
    const toggleTargetText = isResolved ? 'تغيير: لم تحل' : 'تغيير: تم الحل';
    const deviceTag = report.device || 'جهاز ذكي';
    const syncTag = (report.synced === false)
      ? '<span class="card-sync-tag pending">⏳ بانتظار النت</span>'
      : '<span class="card-sync-tag synced">☁️ تم الرفع</span>';

    card.innerHTML = `
      <div class="card-top">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="card-num-badge">صورة رقم ${report.sequenceNumber}</span>
          <span class="card-device-badge">📱 ${escapeHtml(deviceTag)}</span>
          ${syncTag}
        </div>
        <span class="card-status-badge ${report.status}">${statusText}</span>
      </div>

      <div class="card-content-grid">
        <div class="card-thumb" onclick="openReportDetails('${report.id}')" title="اضغط لمعاينة التفاصيل">
          <img src="${report.photo}" alt="صورة ${report.sequenceNumber}">
        </div>
        <div class="card-details" onclick="openReportDetails('${report.id}')" style="cursor: pointer;">
          <p class="card-desc">${escapeHtml(report.notes || 'بدون تفاصيل إضافية...')}</p>
          <div class="card-location">
            <span>📍 ${escapeHtml(report.location ? report.location.address : 'الموقع غير مسجل')}</span>
          </div>
          <div class="card-meta">
            <span>🕒 ${report.displayDate}</span>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <div>
          ${report.location && report.location.mapUrl && report.location.lat !== 0 ? `
            <a href="${report.location.mapUrl}" target="_blank" class="map-link-btn" style="font-size: 0.72rem;">
              🗺️ الخريطة
            </a>
          ` : ''}
          <button class="toggle-status-btn" onclick="toggleReportStatus('${report.id}')">
            ${toggleTargetText}
          </button>
        </div>
        <button class="delete-report-btn" onclick="deleteReport('${report.id}')">
          🗑️ حذف
        </button>
      </div>
    `;

    reportsContainer.appendChild(card);
  });
}

// Toggle Report Status (Resolved <-> Unresolved)
window.toggleReportStatus = function(id) {
  const rep = state.reports.find(r => r.id === id);
  if (rep) {
    rep.status = rep.status === 'resolved' ? 'unresolved' : 'resolved';
    saveReportsToStorage();
    renderReportsList();
    if (navigator.onLine) {
      publishReportUpdate(rep);
    } else {
      rep.synced = false;
      saveReportsToStorage();
    }
    showToast(`تم تغيير حالة صورة رقم ${rep.sequenceNumber}`);
  }
};

// Delete Report
window.deleteReport = function(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا البلاغ؟')) {
    state.reports = state.reports.filter(r => r.id !== id);
    saveReportsToStorage();
    renderReportsList();
    showToast('تم حذف البلاغ');
  }
};

// ==================== REAL-TIME CLOUD & DEVICE LINKING ====================
function getSyncTopic() {
  const cleanRoom = (state.syncRoom || DEFAULT_ROOM).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `system_sync_${cleanRoom}`;
}

// Initialize Realtime Listener (SSE via ntfy.sh + BroadcastChannel)
function initRealtimeCloud() {
  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('bc_' + state.syncRoom);
      channel.onmessage = (event) => {
        handleIncomingMessage(event.data);
      };
    } catch (e) {}
  }

  if (state.eventSource) {
    state.eventSource.close();
  }

  if (!navigator.onLine) {
    syncStatusDot.style.backgroundColor = '#ff3366';
    cloudStatusText.textContent = 'غير متصل بالإنترنت (الوضع غير المتصل نشط)';
    return;
  }

  const topic = getSyncTopic();
  try {
    state.eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);

    state.eventSource.onopen = () => {
      syncStatusDot.style.backgroundColor = '#00e676';
      cloudStatusText.textContent = `متصل في الوقت الفعلي بغرفة (${state.syncRoom})`;
    };

    state.eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.message) {
          const parsedData = JSON.parse(payload.message);
          handleIncomingMessage(parsedData);
        }
      } catch (err) {}
    };

    state.eventSource.onerror = () => {
      syncStatusDot.style.backgroundColor = '#ffb300';
      cloudStatusText.textContent = 'جاري إعادة الاتصال السحابي...';
    };
  } catch (err) {
    console.warn('Realtime SSE init failed:', err);
  }
}

// Handle Incoming Message from another device
function handleIncomingMessage(msg) {
  if (!msg || !msg.type || !msg.report) return;
  if (msg.report.deviceId === state.deviceId) return; // ignore self

  if (msg.type === 'NEW_REPORT') {
    const exists = state.reports.some(r => r.id === msg.report.id);
    if (!exists) {
      msg.report.synced = true;
      state.reports.unshift(msg.report);
      saveReportsToStorage();
      updateUI();
      if (listModal.classList.contains('active')) {
        renderReportsList();
      }
      triggerNewOperationNotification(msg.report);
    }
  } else if (msg.type === 'STATUS_UPDATE') {
    const existing = state.reports.find(r => r.id === msg.report.id);
    if (existing) {
      existing.status = msg.report.status;
      saveReportsToStorage();
      updateUI();
      if (listModal.classList.contains('active')) renderReportsList();
      showToast(`قام ${msg.report.device || 'جهاز آخر'} بتحديث حالة صورة رقم ${msg.report.sequenceNumber}`);
    }
  }
}

// Publish New Report to Cloud Asynchronously
function publishReportToCloudAsync(report) {
  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('bc_' + state.syncRoom);
      channel.postMessage({ type: 'NEW_REPORT', report });
    } catch (e) {}
  }

  const topic = getSyncTopic();
  const payload = JSON.stringify({ type: 'NEW_REPORT', report });

  return fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    body: payload,
    headers: {
      'Title': `عملية جديدة مضافة من ${report.device}`,
      'Priority': 'default'
    }
  });
}

function publishReportToCloud(report) {
  publishReportToCloudAsync(report)
    .then(() => {
      report.synced = true;
      saveReportsToStorage();
    })
    .catch((err) => {
      console.warn('Cloud publish failed (offline):', err);
      report.synced = false;
      saveReportsToStorage();
    });
}

function publishReportUpdate(report) {
  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('bc_' + state.syncRoom);
      channel.postMessage({ type: 'STATUS_UPDATE', report });
    } catch (e) {}
  }

  const topic = getSyncTopic();
  fetch(`https://ntfy.sh/${topic}`, {
    method: 'POST',
    body: JSON.stringify({ type: 'STATUS_UPDATE', report })
  }).catch(() => {
    report.synced = false;
    saveReportsToStorage();
  });
}

// Backup & Export JSON
function exportReportsAsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.reports, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `system_reports_backup_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('تم تحميل ملف النسخة الاحتياطية');
}

// Import JSON
function handleImportFile(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        const existingIds = new Set(state.reports.map(r => r.id));
        let count = 0;
        importedData.forEach(item => {
          if (!existingIds.has(item.id)) {
            state.reports.push(item);
            count++;
          }
        });
        state.reports.sort((a, b) => b.sequenceNumber - a.sequenceNumber);
        saveReportsToStorage();
        showToast(`تم استيراد ${count} بلاغ بنجاح!`);
        closeModal(syncModal);
      } else {
        alert('الملف غير صالح');
      }
    } catch (err) {
      alert('خطأ في قراءة ملف JSON');
    }
  };
  reader.readAsText(file);
}

// ==================== MODAL HELPERS ====================
function openModal(modalEl) {
  modalEl.classList.add('active');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  modalEl.classList.remove('active');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== SERVICE WORKER ====================
function initServiceWorker() {
  // If running inside Capacitor native app or localhost, skip Service Worker
  if (window.Capacitor || window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost') {
    console.log('Native mobile app environment, skipping Service Worker');
    return;
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          console.log('ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.log('ServiceWorker registration failed:', err);
        });
    });
  }
}
