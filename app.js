/**
 * SYSTEM - نظام العمليات والتوثيق الميداني الموحد
 * شاشة سوداء AMOLED + زر أزرق نيون مضيء عائم على اليمين
 * سحب فوري مستمر للموقع GPS منذ لحظة فتح التطبيق
 * واجهة إعدادات أولية لاختيار أو إنشاء Room Code وتحديد الاسم
 * عداد الأجهزة المتصلة والمتواجدة في نفس الغرفة
 * حفظ محلي كامل بدون إنترنت (Offline) ومزامنة ورفع تلقائي عند الاتصال
 * وسم حالة الرفع على كل بلاغ: (نزلت في السيستم ✅ / لسه قيد الرفع ⏳)
 */

// ==================== STATE MANAGEMENT ====================
const DB_KEY = 'system_reports_db_v1';
const ROOM_KEY = 'system_sync_room_id';
const DEVICE_NAME_KEY = 'system_device_name_v1';
const DEVICE_ID_KEY = 'system_device_id_v1';
const SETUP_DONE_KEY = 'system_setup_done';
const DEFAULT_ROOM = 'SYSTEM-MAIN';

let state = {
  reports: [],
  currentPhotoData: null,
  currentLocation: null,
  activeFilter: 'all',
  syncRoom: localStorage.getItem(ROOM_KEY) || DEFAULT_ROOM,
  deviceId: getOrCreateDeviceId(),
  deviceName: getInitialDeviceName(),
  onlineMembers: new Map(), // deviceId -> { name, lastSeen, device }
  eventSource: null,
  currentViewingReportId: null,
  isSyncingPending: false,
  gpsWatchId: null,
  lastGeocodeTime: 0
};

// ==================== DOM ELEMENTS ====================
// Header & Live Indicators
const liveGpsPill = document.getElementById('liveGpsPill');
const liveGpsText = document.getElementById('liveGpsText');
const gpsDot = document.getElementById('gpsDot');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const membersCountText = document.getElementById('membersCountText');
const openSettingsBtn = document.getElementById('openSettingsBtn');

// Network Bar
const networkStatusBar = document.getElementById('networkStatusBar');
const netStatusIcon = document.getElementById('netStatusIcon');
const netStatusText = document.getElementById('netStatusText');

// Main Feed & Controls
const reportCountBadge = document.getElementById('reportCountBadge');
const countAll = document.getElementById('countAll');
const countUnresolved = document.getElementById('countUnresolved');
const countResolved = document.getElementById('countResolved');
const filterChips = document.querySelectorAll('.filter-chip');
const systemLoader = document.getElementById('systemLoader');
const reportsContainer = document.getElementById('reportsContainer');
const emptyState = document.getElementById('emptyState');

// Floating Action Circle (On the Right)
const floatingCircleWrapper = document.getElementById('floatingCircleWrapper');
const floatingNextTag = document.getElementById('floatingNextTag');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const cameraInput = document.getElementById('cameraInput');

// Onboarding Welcome Modal
const welcomeModal = document.getElementById('welcomeModal');
const welcomeNameInput = document.getElementById('welcomeNameInput');
const welcomeRoomRadios = document.querySelectorAll('input[name="welcomeRoomType"]');
const welcomeRoomCodeWrapper = document.getElementById('welcomeRoomCodeWrapper');
const welcomeRoomInput = document.getElementById('welcomeRoomInput');
const welcomeSubmitBtn = document.getElementById('welcomeSubmitBtn');

// Settings Modal
const settingsModal = document.getElementById('settingsModal');
const settingsModalOverlay = document.getElementById('settingsModalOverlay');
const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
const settingsNameInput = document.getElementById('settingsNameInput');
const saveSettingsNameBtn = document.getElementById('saveSettingsNameBtn');
const settingsRoomInput = document.getElementById('settingsRoomInput');
const applySettingsRoomBtn = document.getElementById('applySettingsRoomBtn');
const connectedMembersBox = document.getElementById('connectedMembersBox');
const myMemberLabel = document.getElementById('myMemberLabel');
const enableNotifBtn = document.getElementById('enableNotifBtn');
const forceSyncBtn = document.getElementById('forceSyncBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const importFileInput = document.getElementById('importFileInput');

// Report Creation Modal
const reportModal = document.getElementById('reportModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelReportBtn = document.getElementById('cancelReportBtn');
const saveReportBtn = document.getElementById('saveReportBtn');
const modalPhotoNumber = document.getElementById('modalPhotoNumber');
const modalDeviceTag = document.getElementById('modalDeviceTag');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const retakePhotoBtn = document.getElementById('retakePhotoBtn');
const problemNotes = document.getElementById('problemNotes');
const latVal = document.getElementById('latVal');
const lngVal = document.getElementById('lngVal');
const accVal = document.getElementById('accVal');
const addressVal = document.getElementById('addressVal');
const mapLinkBtn = document.getElementById('mapLinkBtn');
const refreshLocationBtn = document.getElementById('refreshLocationBtn');

// Detail Modal
const detailModal = document.getElementById('detailModal');
const detailModalOverlay = document.getElementById('detailModalOverlay');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const detailCloseBtn = document.getElementById('detailCloseBtn');
const detailPhotoNum = document.getElementById('detailPhotoNum');
const detailDeviceName = document.getElementById('detailDeviceName');
const detailSyncBadge = document.getElementById('detailSyncBadge');
const detailPhotoImg = document.getElementById('detailPhotoImg');
const detailStatusPill = document.getElementById('detailStatusPill');
const detailStatusDot = document.getElementById('detailStatusDot');
const detailStatusText = document.getElementById('detailStatusText');
const detailNotesText = document.getElementById('detailNotesText');
const detailAddress = document.getElementById('detailAddress');
const detailMapLink = document.getElementById('detailMapLink');
const detailTime = document.getElementById('detailTime');
const detailToggleStatusBtn = document.getElementById('detailToggleStatusBtn');

// Floating In-App Push Notification
const inAppNotification = document.getElementById('inAppNotification');
const notifTitle = document.getElementById('notifTitle');
const notifMeta = document.getElementById('notifMeta');
const notifThumbBox = document.getElementById('notifThumbBox');
const notifThumbImg = document.getElementById('notifThumbImg');

// Toast
const toast = document.getElementById('toast');

// ==================== DEVICE IDENTIFICATION ====================
function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getInitialDeviceName() {
  const custom = localStorage.getItem(DEVICE_NAME_KEY);
  if (custom && custom.trim()) return custom.trim();

  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'iPhone';
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android[^;]+; ([^;)]+)/);
    if (match && match[1]) {
      return `Android (${match[1].trim()})`;
    }
    return 'Android';
  }
  return 'هاتف ذكي';
}

// ==================== INITIALIZATION ====================
function initApp() {
  try {
    loadReportsFromStorage();
    checkUrlParams();
    updateHeaderUI();
    setupEventListeners();
    initServiceWorker();
    initNetworkListeners();
    startLiveLocationTracking();
    initRealtimeCloud();
    startPresenceHeartbeat();

    // Check First-Time Launch Onboarding
    checkFirstTimeOnboarding();

    // Initial feed render with loader
    showSystemLoader(600);
    renderReportsFeed();
  } catch (err) {
    console.error('App init error:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Check URL Params (e.g. ?room=ROOM101)
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomParam = urlParams.get('room');
  if (roomParam && roomParam.trim()) {
    state.syncRoom = roomParam.trim().toUpperCase();
    localStorage.setItem(ROOM_KEY, state.syncRoom);
  }
}

// Check First-Time Setup
function checkFirstTimeOnboarding() {
  const isSetupDone = localStorage.getItem(SETUP_DONE_KEY) === 'true';
  if (!isSetupDone) {
    // Pre-fill device name if default
    if (state.deviceName) {
      welcomeNameInput.value = state.deviceName;
    }
    openModal(welcomeModal);
  }
}

// ==================== STORAGE & REPORTS ====================
function loadReportsFromStorage() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    state.reports = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error loading reports:', err);
    state.reports = [];
  }
}

function saveReportsToStorage() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state.reports));
    updateHeaderUI();
  } catch (err) {
    console.error('Storage error:', err);
    showToast('تنبيه: سعة التخزين المحلية ممتلئة');
  }
}

function getNextSequenceNumber() {
  if (!state.reports || state.reports.length === 0) return 1;
  const maxNum = state.reports.reduce((max, r) => Math.max(max, r.sequenceNumber || 0), 0);
  return maxNum + 1;
}

// ==================== CONTINUOUS LIVE GPS TRACKING ====================
/**
 * يبدأ سحب اللوكيشن بمجرد فتح التطبيق مباشرة وبشكل مستمر دون انقطاع
 */
function startLiveLocationTracking() {
  if (!navigator.geolocation) {
    liveGpsText.textContent = 'GPS غير مدعوم';
    return;
  }

  liveGpsText.textContent = 'جاري البحث عن GPS...';
  if (gpsDot) gpsDot.className = 'gps-pulse-dot';

  const gpsOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 3000
  };

  const handlePosition = (pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const accMeters = Math.round(accuracy);

    // Save into state so it's instantly available when camera opens
    const isNewCoord = !state.currentLocation ||
      Math.abs(state.currentLocation.lat - latitude) > 0.0005 ||
      Math.abs(state.currentLocation.lng - longitude) > 0.0005;

    state.currentLocation = {
      lat: latitude,
      lng: longitude,
      accuracy: accMeters,
      address: state.currentLocation && !isNewCoord
        ? state.currentLocation.address
        : (navigator.onLine ? 'جاري تحديد اسم المنطقة...' : `إحداثيات GPS (±${accMeters}م)`),
      mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
    };

    // Update Header Pill
    liveGpsText.textContent = `📍 GPS نشط (±${accMeters}م)`;
    if (gpsDot) gpsDot.className = 'gps-pulse-dot active';

    // If report modal is currently open, update fields live
    if (reportModal.classList.contains('active')) {
      updateReportModalLocationUI();
    }

    // Reverse Geocode if online and coordinates changed or no address yet
    if (navigator.onLine && isNewCoord && (Date.now() - state.lastGeocodeTime > 8000)) {
      state.lastGeocodeTime = Date.now();
      reverseGeocodeCoordinates(latitude, longitude);
    }
  };

  const handleGpsError = (err) => {
    console.warn('Live GPS watch notice:', err.message);
    if (err.code === 1) { // PERMISSION_DENIED
      liveGpsText.textContent = 'تم رفض إذن GPS ⚠️';
    } else {
      liveGpsText.textContent = 'جاري تحسين GPS...';
    }
    if (gpsDot) gpsDot.className = 'gps-pulse-dot';
  };

  // 1. Immediate fetch
  navigator.geolocation.getCurrentPosition(handlePosition, handleGpsError, gpsOptions);

  // 2. Continuous watch
  try {
    if (state.gpsWatchId) navigator.geolocation.clearWatch(state.gpsWatchId);
    state.gpsWatchId = navigator.geolocation.watchPosition(handlePosition, handleGpsError, gpsOptions);
  } catch (e) {
    console.warn('watchPosition failed:', e);
  }
}

async function reverseGeocodeCoordinates(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
      { headers: { 'User-Agent': 'SystemReportMobileApp/2.0' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (state.currentLocation) {
        state.currentLocation.address = addr;
      }
      if (reportModal.classList.contains('active')) {
        addressVal.textContent = addr;
      }
    }
  } catch (e) {
    // Fail gracefully
  }
}

function updateReportModalLocationUI() {
  if (!state.currentLocation || state.currentLocation.lat === 0) {
    latVal.textContent = '---';
    lngVal.textContent = '---';
    accVal.textContent = '--';
    addressVal.textContent = 'جاري سحب اللوكيشن تلقائياً من GPS...';
    mapLinkBtn.style.pointerEvents = 'none';
    mapLinkBtn.style.opacity = '0.5';
    return;
  }

  latVal.textContent = state.currentLocation.lat.toFixed(5);
  lngVal.textContent = state.currentLocation.lng.toFixed(5);
  accVal.textContent = state.currentLocation.accuracy;
  addressVal.textContent = state.currentLocation.address || 'تم قفل الموقع بدقة GPS';
  mapLinkBtn.href = state.currentLocation.mapUrl;
  mapLinkBtn.style.pointerEvents = 'auto';
  mapLinkBtn.style.opacity = '1';
}

// ==================== HEADER & UI UPDATES ====================
function updateHeaderUI() {
  const nextNum = getNextSequenceNumber();
  floatingNextTag.textContent = `صورة رقم ${nextNum}`;
  reportCountBadge.textContent = `${state.reports.length} بلاغ`;
  roomCodeDisplay.textContent = `غرفة: ${state.syncRoom}`;

  const resolvedCount = state.reports.filter(r => r.status === 'resolved').length;
  const unresolvedCount = state.reports.filter(r => r.status === 'unresolved').length;

  countAll.textContent = state.reports.length;
  countResolved.textContent = resolvedCount;
  countUnresolved.textContent = unresolvedCount;

  updateConnectedMembersCountUI();
}

function showSystemLoader(durationMs = 600) {
  systemLoader.style.display = 'flex';
  reportsContainer.style.opacity = '0.3';
  setTimeout(() => {
    systemLoader.style.display = 'none';
    reportsContainer.style.opacity = '1';
  }, durationMs);
}

// ==================== CENTER SYSTEM FEED ====================
function renderReportsFeed() {
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

    // Upload status requirement: "نزلت في السيستم" or "لسه قيد الرفع"
    const isUploaded = report.synced !== false;
    const syncBadgeHtml = isUploaded
      ? `<span class="card-sync-tag synced">نزلت في السيستم ✅</span>`
      : `<span class="card-sync-tag pending">لسه قيد الرفع ⏳</span>`;

    card.innerHTML = `
      <div class="card-top">
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="card-num-badge">صورة رقم ${report.sequenceNumber}</span>
          <span class="card-device-badge">📱 ${escapeHtml(deviceTag)}</span>
          ${syncBadgeHtml}
        </div>
        <span class="card-status-badge ${report.status}">${statusText}</span>
      </div>

      <div class="card-content-grid">
        <div class="card-thumb" onclick="openReportDetails('${report.id}')" title="معاينة الصورة">
          <img src="${report.photo}" alt="صورة ${report.sequenceNumber}" loading="lazy">
        </div>
        <div class="card-details" onclick="openReportDetails('${report.id}')" style="cursor: pointer;">
          <p class="card-desc">${escapeHtml(report.notes || 'بدون تفاصيل إضافية...')}</p>
          <div class="card-location">
            <span>📍 ${escapeHtml(report.location ? report.location.address : 'الموقع غير مسجل')}</span>
          </div>
          <div class="card-meta">
            <span>🕒 ${report.displayDate || 'الآن'}</span>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <div style="display: flex; gap: 6px;">
          ${report.location && report.location.mapUrl && report.location.lat !== 0 ? `
            <a href="${report.location.mapUrl}" target="_blank" class="map-link-btn" style="font-size: 0.72rem; padding: 3px 8px;">
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

// Toggle Report Status
window.toggleReportStatus = function(id) {
  const rep = state.reports.find(r => r.id === id);
  if (!rep) return;

  rep.status = rep.status === 'resolved' ? 'unresolved' : 'resolved';
  saveReportsToStorage();
  renderReportsFeed();

  if (navigator.onLine) {
    publishReportUpdate(rep);
  } else {
    rep.synced = false;
    saveReportsToStorage();
    renderReportsFeed();
  }
  showToast(`تم تحديث حالة صورة رقم ${rep.sequenceNumber}`);
};

// Delete Report
window.deleteReport = function(id) {
  if (confirm('هل أنت متأكد من حذف هذا البلاغ نهائياً من السيستم؟')) {
    state.reports = state.reports.filter(r => r.id !== id);
    saveReportsToStorage();
    renderReportsFeed();
    showToast('تم حذف البلاغ');
  }
};

// ==================== REPORT DETAILS MODAL ====================
window.openReportDetails = function(reportId) {
  const report = state.reports.find(r => r.id === reportId);
  if (!report) return;

  state.currentViewingReportId = report.id;

  detailPhotoNum.textContent = `صورة رقم ${report.sequenceNumber}`;
  detailDeviceName.textContent = report.device || 'غير معروف';

  // Sync Badge
  const isUploaded = report.synced !== false;
  detailSyncBadge.className = isUploaded ? 'card-sync-tag synced' : 'card-sync-tag pending';
  detailSyncBadge.textContent = isUploaded ? 'نزلت في السيستم ✅' : 'لسه قيد الرفع ⏳';

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

  detailTime.textContent = report.displayDate || 'الآن';
  detailToggleStatusBtn.textContent = isResolved ? 'تغيير الحالة إلى: لم تُحل ❌' : 'تغيير الحالة إلى: تم الحل ✅';

  openModal(detailModal);
};

// ==================== PHOTO CAPTURE & SAVE WORKFLOW ====================
async function handlePhotoSelection(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  showToast('جاري معالجة الصورة وقفل اللوكيشن...');

  try {
    const compressedBase64 = await compressImage(file, 1200, 0.75);
    state.currentPhotoData = compressedBase64;
    photoPreviewImg.src = compressedBase64;

    const nextNum = getNextSequenceNumber();
    modalPhotoNumber.textContent = `صورة رقم ${nextNum}`;
    modalDeviceTag.textContent = `📱 ${state.deviceName}`;

    problemNotes.value = '';
    const unresolvedRadio = document.querySelector('input[name="problemStatus"][value="unresolved"]');
    if (unresolvedRadio) unresolvedRadio.checked = true;

    // Immediately update modal with pre-locked GPS from app launch
    updateReportModalLocationUI();

    openModal(reportModal);
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

function saveCurrentReport() {
  if (!state.currentPhotoData) {
    showToast('يرجى التقاط صورة أولاً');
    return;
  }

  const selectedStatusEl = document.querySelector('input[name="problemStatus"]:checked');
  const selectedStatus = selectedStatusEl ? selectedStatusEl.value : 'unresolved';
  const notes = problemNotes.value.trim();
  const seqNum = getNextSequenceNumber();
  const isOnline = navigator.onLine;

  const newReport = {
    id: 'rep_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    sequenceNumber: seqNum,
    photo: state.currentPhotoData,
    status: selectedStatus,
    notes: notes,
    location: state.currentLocation || {
      lat: 0,
      lng: 0,
      accuracy: 0,
      address: 'لم يتم تحديد موقع GPS',
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
    synced: isOnline // true if published, false if offline pending
  };

  state.reports.unshift(newReport);
  saveReportsToStorage();
  renderReportsFeed();
  closeReportModal();

  if (isOnline) {
    publishReportToCloud(newReport);
    showToast(`✅ تم حفظ ونشر "صورة رقم ${seqNum}" في السيستم بنجاح!`);
  } else {
    showToast(`💾 تم حفظ "صورة رقم ${seqNum}" محلياً (سترفع تلقائياً عند الاتصال بالإنترنت)`);
  }
}

function closeReportModal() {
  closeModal(reportModal);
  state.currentPhotoData = null;
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

  // Auto-sync timer every 15s when online
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
    netStatusText.textContent = 'وضع عدم الاتصال (بدون إنترنت) - يتم حفظ العمليات محلياً ورفعها تلقائياً للسيستم عند الاتصال بالواي فاي';
  } else {
    if (pendingCount > 0 && !state.isSyncingPending) {
      networkStatusBar.className = 'network-status-bar syncing';
      networkStatusBar.style.display = 'flex';
      netStatusIcon.textContent = '🔄';
      netStatusText.textContent = `متصل بالإنترنت! جاري رفع ${pendingCount} بلاغ محفوظ إلى السيستم...`;
    } else if (!state.isSyncingPending) {
      networkStatusBar.style.display = 'none';
    }
  }
}

async function syncPendingReports() {
  if (state.isSyncingPending || !navigator.onLine) return;

  const pending = state.reports.filter(r => r.synced === false);
  if (pending.length === 0) return;

  state.isSyncingPending = true;
  networkStatusBar.className = 'network-status-bar syncing';
  networkStatusBar.style.display = 'flex';
  netStatusIcon.textContent = '🔄';
  netStatusText.textContent = `تم الاتصال بالإنترنت! جاري رفع ومزامنة ${pending.length} بلاغ إلى السيستم...`;

  let successCount = 0;

  for (const report of pending) {
    try {
      if (report.location && report.location.lat !== 0 && (!report.location.address || report.location.address.includes('إحداثيات'))) {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${report.location.lat}&lon=${report.location.lng}&accept-language=ar`,
            { headers: { 'User-Agent': 'SystemReportMobileApp/2.0' } }
          );
          if (resp.ok) {
            const geoData = await resp.json();
            if (geoData.display_name) report.location.address = geoData.display_name;
          }
        } catch (e) {}
      }

      await publishReportToCloudAsync(report);
      report.synced = true;
      successCount++;
    } catch (err) {
      console.warn('Failed to sync report:', report.id, err);
    }
  }

  state.isSyncingPending = false;
  saveReportsToStorage();
  renderReportsFeed();

  if (successCount > 0) {
    networkStatusBar.className = 'network-status-bar online-success';
    netStatusIcon.textContent = '✅';
    netStatusText.textContent = `تم بنجاح رفع ومزامنة ${successCount} عملية إلى السيستم!`;
    playChimeSound();
    showToast(`🎉 تم الاتصال بالإنترنت ومزامنة ${successCount} عملية في السيستم!`);

    setTimeout(() => {
      networkStatusBar.style.display = 'none';
    }, 4000);
  }
}

// ==================== PRESENCE & ONLINE MEMBERS SYSTEM ====================
function startPresenceHeartbeat() {
  // Send presence ping immediately
  sendPresencePing();

  // Send periodic ping every 12 seconds
  setInterval(() => {
    sendPresencePing();
  }, 12000);

  // Clean inactive devices every 4 seconds
  setInterval(() => {
    const threshold = Date.now() - 35000;
    let changed = false;

    state.onlineMembers.forEach((member, devId) => {
      if (member.lastSeen < threshold) {
        state.onlineMembers.delete(devId);
        changed = true;
      }
    });

    if (changed) {
      updateConnectedMembersCountUI();
    }
  }, 4000);
}

function sendPresencePing() {
  const pingPayload = {
    type: 'PRESENCE_PING',
    deviceId: state.deviceId,
    deviceName: state.deviceName,
    room: state.syncRoom,
    timestamp: Date.now()
  };

  // 1. BroadcastChannel (local tabs / webviews)
  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('bc_' + state.syncRoom);
      channel.postMessage(pingPayload);
    } catch (e) {}
  }

  // 2. ntfy.sh low-priority ping
  if (navigator.onLine) {
    const topic = getSyncTopic();
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify(pingPayload),
      headers: {
        'Priority': 'min',
        'Title': 'Presence Ping'
      }
    }).catch(() => {});
  }
}

function updateConnectedMembersCountUI() {
  // Self + peers
  const totalConnected = state.onlineMembers.size + 1;
  membersCountText.textContent = `👥 ${totalConnected} متصل`;

  // Update Settings Modal list
  if (myMemberLabel) {
    myMemberLabel.textContent = `أنت (${state.deviceName})`;
  }

  if (connectedMembersBox) {
    connectedMembersBox.innerHTML = `
      <div class="member-tag you">
        <span class="dot"></span>
        <span>أنت (${escapeHtml(state.deviceName)})</span>
      </div>
    `;

    state.onlineMembers.forEach((member) => {
      const tag = document.createElement('div');
      tag.className = 'member-tag';
      tag.innerHTML = `
        <span class="dot"></span>
        <span>📱 ${escapeHtml(member.name || 'عضو متصل')}</span>
      `;
      connectedMembersBox.appendChild(tag);
    });
  }
}

// ==================== AUDIO & NOTIFICATIONS ====================
function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.12);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {}
}

function triggerNewOperationNotification(report) {
  playChimeSound();
  if (navigator.vibrate) {
    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
  }

  // Floating In-App Banner
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

  // Native Push
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
    } catch (e) {}
  }
}

// ==================== REAL-TIME CLOUD & CROSS DEVICE SYNC ====================
function getSyncTopic() {
  const cleanRoom = (state.syncRoom || DEFAULT_ROOM).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `system_sync_${cleanRoom}`;
}

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

  if (!navigator.onLine) return;

  const topic = getSyncTopic();
  try {
    state.eventSource = new EventSource(`https://ntfy.sh/${topic}/sse`);

    state.eventSource.onopen = () => {
      console.log('Realtime connected to room:', state.syncRoom);
      sendPresencePing();
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
      // Reconnect automatically handled by EventSource
    };
  } catch (err) {
    console.warn('Realtime SSE init failed:', err);
  }
}

function handleIncomingMessage(msg) {
  if (!msg || !msg.type) return;

  // Handle Presence Ping
  if (msg.type === 'PRESENCE_PING') {
    if (msg.deviceId && msg.deviceId !== state.deviceId) {
      state.onlineMembers.set(msg.deviceId, {
        name: msg.deviceName || 'جهاز متصل',
        lastSeen: Date.now()
      });
      updateConnectedMembersCountUI();
    }
    return;
  }

  if (!msg.report) return;
  if (msg.report.deviceId === state.deviceId) return; // ignore self

  if (msg.type === 'NEW_REPORT') {
    const exists = state.reports.some(r => r.id === msg.report.id);
    if (!exists) {
      msg.report.synced = true;
      state.reports.unshift(msg.report);
      saveReportsToStorage();
      renderReportsFeed();
      triggerNewOperationNotification(msg.report);
    }
  } else if (msg.type === 'STATUS_UPDATE') {
    const existing = state.reports.find(r => r.id === msg.report.id);
    if (existing) {
      existing.status = msg.report.status;
      saveReportsToStorage();
      renderReportsFeed();
      showToast(`قام ${msg.report.device || 'جهاز آخر'} بتحديث حالة صورة رقم ${msg.report.sequenceNumber}`);
    }
  }
}

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
      renderReportsFeed();
    })
    .catch((err) => {
      console.warn('Cloud publish failed (offline):', err);
      report.synced = false;
      saveReportsToStorage();
      renderReportsFeed();
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
    renderReportsFeed();
  });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // 1. Floating Action Circle (Right Side)
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

  // Close Report Modal
  cancelReportBtn.addEventListener('click', closeReportModal);
  closeModalBtn.addEventListener('click', closeReportModal);
  modalOverlay.addEventListener('click', closeReportModal);

  // Refresh GPS Location in Modal
  refreshLocationBtn.addEventListener('click', () => {
    showToast('جاري تحديث إحداثيات GPS...');
    startLiveLocationTracking();
  });

  // 2. Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderReportsFeed();
    });
  });

  // 3. Detail Modal
  closeDetailModalBtn.addEventListener('click', () => closeModal(detailModal));
  detailCloseBtn.addEventListener('click', () => closeModal(detailModal));
  detailModalOverlay.addEventListener('click', () => closeModal(detailModal));

  detailToggleStatusBtn.addEventListener('click', () => {
    if (state.currentViewingReportId) {
      toggleReportStatus(state.currentViewingReportId);
      openReportDetails(state.currentViewingReportId);
    }
  });

  // 4. Settings Modal (⚙️)
  openSettingsBtn.addEventListener('click', () => {
    settingsNameInput.value = state.deviceName;
    settingsRoomInput.value = state.syncRoom;
    updateConnectedMembersCountUI();
    openModal(settingsModal);
  });

  closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
  settingsModalOverlay.addEventListener('click', () => closeModal(settingsModal));

  saveSettingsNameBtn.addEventListener('click', () => {
    const customName = settingsNameInput.value.trim();
    if (customName) {
      state.deviceName = customName;
      localStorage.setItem(DEVICE_NAME_KEY, customName);
      sendPresencePing();
      updateConnectedMembersCountUI();
      showToast(`تم حفظ اسمك: ${customName}`);
    }
  });

  applySettingsRoomBtn.addEventListener('click', () => {
    const newRoom = settingsRoomInput.value.trim().toUpperCase() || DEFAULT_ROOM;
    if (newRoom !== state.syncRoom) {
      state.syncRoom = newRoom;
      localStorage.setItem(ROOM_KEY, newRoom);
      state.onlineMembers.clear();
      updateHeaderUI();
      closeModal(settingsModal);
      showSystemLoader(700);
      initRealtimeCloud();
      showToast(`تم الانتقال إلى الغرفة: ${newRoom}`);
    } else {
      closeModal(settingsModal);
    }
  });

  enableNotifBtn.addEventListener('click', async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('تم تفعيل إشعارات الهاتف بنجاح! 🔔');
      } else {
        showToast('يرجى السماح بالإشعارات من إعدادات المتصفح أو التطبيق');
      }
    } else {
      showToast('الإشعارات مدعومة داخل التطبيق تلقائياً');
    }
  });

  forceSyncBtn.addEventListener('click', () => {
    if (!navigator.onLine) {
      showToast('لا يوجد اتصال بالإنترنت حالياً');
      return;
    }
    syncPendingReports();
    showToast('جاري التحقق والمزامنة الفورية...');
  });

  exportDataBtn.addEventListener('click', exportReportsAsJson);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportFile);

  // 5. Welcome Modal (First-Time Onboarding)
  welcomeRoomRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'new') {
        welcomeRoomCodeWrapper.style.display = 'none';
      } else {
        welcomeRoomCodeWrapper.style.display = 'block';
        welcomeRoomInput.focus();
      }
    });
  });

  welcomeSubmitBtn.addEventListener('click', () => {
    const nameVal = welcomeNameInput.value.trim();
    if (!nameVal) {
      showToast('يرجى كتابة اسمك أولاً');
      welcomeNameInput.focus();
      return;
    }

    const roomTypeSelected = document.querySelector('input[name="welcomeRoomType"]:checked').value;
    let roomVal = '';

    if (roomTypeSelected === 'existing') {
      roomVal = welcomeRoomInput.value.trim().toUpperCase() || DEFAULT_ROOM;
    } else {
      roomVal = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
    }

    state.deviceName = nameVal;
    state.syncRoom = roomVal;

    localStorage.setItem(DEVICE_NAME_KEY, nameVal);
    localStorage.setItem(ROOM_KEY, roomVal);
    localStorage.setItem(SETUP_DONE_KEY, 'true');

    closeModal(welcomeModal);
    updateHeaderUI();
    showSystemLoader(700);
    initRealtimeCloud();
    sendPresencePing();

    showToast(`مرحباً بك يا ${nameVal}! تم الانضمام لغرفة: ${roomVal}`);
  });
}

// ==================== BACKUP & EXPORT ====================
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
        renderReportsFeed();
        showToast(`تم استيراد ${count} عملية بنجاح!`);
        closeModal(settingsModal);
      } else {
        alert('الملف غير صالح');
      }
    } catch (err) {
      alert('خطأ في قراءة ملف JSON');
    }
  };
  reader.readAsText(file);
}

// ==================== MODAL & UI HELPERS ====================
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
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== SERVICE WORKER ====================
function initServiceWorker() {
  if (window.Capacitor || window.location.protocol === 'capacitor:' || window.location.hostname === 'localhost') {
    return;
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}
