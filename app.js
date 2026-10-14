/**
 * SYSTEM - نظام العمليات والتوثيق الميداني الموحد
 * 1. عزل بيانات كل غرفة بالكامل: لكل غرفة سيستم خاص بها، وإذا خرج المستخدم لا يظهر أي شيء، وإذا دخل تظهر بيانات الغرفة فوراً
 * 2. وضع شاشة السيارة Apple CarPlay Dashboard للقراءة والتحكم أثناء القيادة مع دعم النطق الصوتي TTS
 * 3. اختصارات Apple Shortcuts وتطبيق الاختصارات عبر الرابط systemapp://new و systemapp://carplay
 * 4. سحب فوري مستمر للـ GPS بالأقمار الصناعية منذ تشغيل التطبيق
 * 5. ترقيم تلقائي وحفظ محلي بدون إنترنت (Offline) ومزامنة سحابية فورية
 */

// ==================== STATE MANAGEMENT ====================
const ROOM_KEY = 'system_sync_room_id';
const EXPLICIT_LEAVE_KEY = 'system_room_explicit_left';
const DEVICE_NAME_KEY = 'system_device_name_v1';
const DEVICE_ID_KEY = 'system_device_id_v1';
const SETUP_DONE_KEY = 'system_setup_done';
const DEFAULT_ROOM = 'SYSTEM-MAIN';

// Helper: Per-Room Storage Key
function getRoomDbKey(room) {
  if (!room || !room.trim()) return null;
  const clean = room.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  return `system_reports_room_${clean}`;
}

let state = {
  reports: [],
  currentPhotoData: null,
  currentLocation: null,
  activeFilter: 'all',
  syncRoom: (localStorage.getItem(EXPLICIT_LEAVE_KEY) === 'true')
    ? ''
    : (localStorage.getItem(ROOM_KEY) || DEFAULT_ROOM),
  deviceId: getOrCreateDeviceId(),
  deviceName: getInitialDeviceName(),
  onlineMembers: new Map(), // deviceId -> { name, lastSeen }
  eventSource: null,
  currentViewingReportId: null,
  isSyncingPending: false,
  gpsWatchId: null,
  lastGeocodeTime: 0,
  carPlayClockInterval: null
};

// ==================== DOM ELEMENTS ====================
// Header & Live Indicators
const liveGpsPill = document.getElementById('liveGpsPill');
const liveGpsText = document.getElementById('liveGpsText');
const gpsDot = document.getElementById('gpsDot');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');
const membersCountText = document.getElementById('membersCountText');
const carPlayToggleBtn = document.getElementById('carPlayToggleBtn');
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
const emptyRoomState = document.getElementById('emptyRoomState');
const joinOrCreateRoomBtn = document.getElementById('joinOrCreateRoomBtn');

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
const settingsLeaveRoomBtn = document.getElementById('settingsLeaveRoomBtn');
const openCarPlayBtn = document.getElementById('openCarPlayBtn');
const copyNewShortcutBtn = document.getElementById('copyNewShortcutBtn');
const copyCarPlayShortcutBtn = document.getElementById('copyCarPlayShortcutBtn');
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

// Apple CarPlay Dashboard Overlay
const carPlayOverlay = document.getElementById('carPlayOverlay');
const cpRoomTitle = document.getElementById('cpRoomTitle');
const cpClock = document.getElementById('cpClock');
const closeCarPlayBtn = document.getElementById('closeCarPlayBtn');
const cpMembersText = document.getElementById('cpMembersText');
const cpGpsText = document.getElementById('cpGpsText');
const cpReportsText = document.getElementById('cpReportsText');
const cpNewReportBtn = document.getElementById('cpNewReportBtn');
const cpSpeakBtn = document.getElementById('cpSpeakBtn');
const cpSpeakSubtext = document.getElementById('cpSpeakSubtext');
const carPlayFeed = document.getElementById('carPlayFeed');

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
    checkUrlShortcutsAndParams();
    loadReportsForCurrentRoom();
    updateHeaderUI();
    setupEventListeners();
    initServiceWorker();
    initNetworkListeners();
    startLiveLocationTracking();

    if (state.syncRoom) {
      initRealtimeCloud();
      startPresenceHeartbeat();
    }

    checkFirstTimeOnboarding();
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

// ==================== SHORTCUTS & URL SCHEME HANDLER ====================
function checkUrlShortcutsAndParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;

  // 1. Room Param
  const roomParam = urlParams.get('room');
  if (roomParam && roomParam.trim()) {
    state.syncRoom = roomParam.trim().toUpperCase();
    localStorage.removeItem(EXPLICIT_LEAVE_KEY);
    localStorage.setItem(ROOM_KEY, state.syncRoom);
  }

  // 2. Action Shortcuts
  const action = urlParams.get('action');
  if (action === 'new' || hash === '#new') {
    setTimeout(() => {
      showToast('🚀 تشغيل اختصار: توثيق بلاغ جديد...');
      if (takePhotoBtn) takePhotoBtn.click();
    }, 400);
  } else if (action === 'carplay' || hash === '#carplay') {
    setTimeout(() => {
      openCarPlayMode();
    }, 400);
  }

  // Capacitor deep link listener
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    try {
      window.Capacitor.Plugins.App.addListener('appUrlOpen', (data) => {
        if (data && data.url) {
          handleDeepLink(data.url);
        }
      });
    } catch (e) {}
  }
}

function handleDeepLink(urlStr) {
  try {
    if (urlStr.includes('new')) {
      if (takePhotoBtn) takePhotoBtn.click();
    } else if (urlStr.includes('carplay')) {
      openCarPlayMode();
    }
  } catch (e) {}
}

// Check First-Time Setup
function checkFirstTimeOnboarding() {
  const isSetupDone = localStorage.getItem(SETUP_DONE_KEY) === 'true';
  if (!isSetupDone && !state.syncRoom) {
    if (state.deviceName && welcomeNameInput) {
      welcomeNameInput.value = state.deviceName;
    }
    openModal(welcomeModal);
  }
}

// ==================== PER-ROOM ISOLATED STORAGE ====================
function loadReportsForCurrentRoom() {
  if (!state.syncRoom) {
    state.reports = [];
    return;
  }
  try {
    const key = getRoomDbKey(state.syncRoom);
    let raw = localStorage.getItem(key);

    // Legacy migration: If new room key is empty, check legacy key
    if (!raw && state.syncRoom === DEFAULT_ROOM) {
      const legacy = localStorage.getItem('system_reports_db_v1');
      if (legacy) {
        raw = legacy;
        localStorage.setItem(key, legacy);
      }
    }

    state.reports = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error loading room reports:', err);
    state.reports = [];
  }
}

function saveReportsForCurrentRoom() {
  if (!state.syncRoom) return;
  try {
    const key = getRoomDbKey(state.syncRoom);
    localStorage.setItem(key, JSON.stringify(state.reports));
    updateHeaderUI();
  } catch (err) {
    console.error('Storage quota error:', err);
    showToast('تنبيه: سعة التخزين المحلية ممتلئة');
  }
}

function getNextSequenceNumber() {
  if (!state.reports || state.reports.length === 0) return 1;
  const maxNum = state.reports.reduce((max, r) => Math.max(max, r.sequenceNumber || 0), 0);
  return maxNum + 1;
}

// ==================== CONTINUOUS LIVE GPS TRACKING ====================
function startLiveLocationTracking() {
  if (!navigator.geolocation) {
    if (liveGpsText) liveGpsText.textContent = 'GPS غير مدعوم';
    return;
  }

  if (liveGpsText) liveGpsText.textContent = 'جاري البحث عن GPS...';
  if (gpsDot) gpsDot.className = 'gps-pulse-dot';

  const gpsOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 3000
  };

  const handlePosition = (pos) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const accMeters = Math.round(accuracy);

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

    if (liveGpsText) liveGpsText.textContent = `📍 GPS نشط (±${accMeters}م)`;
    if (gpsDot) gpsDot.className = 'gps-pulse-dot active';

    if (cpGpsText) {
      cpGpsText.innerHTML = `📍 GPS نشط (دقة ±${accMeters}م)`;
    }

    if (reportModal && reportModal.classList.contains('active')) {
      updateReportModalLocationUI();
    }

    if (navigator.onLine && isNewCoord && (Date.now() - state.lastGeocodeTime > 8000)) {
      state.lastGeocodeTime = Date.now();
      reverseGeocodeCoordinates(latitude, longitude);
    }
  };

  const handleGpsError = (err) => {
    if (liveGpsText) {
      if (err.code === 1) {
        liveGpsText.textContent = 'تم رفض إذن GPS ⚠️';
      } else {
        liveGpsText.textContent = 'جاري تحسين GPS...';
      }
    }
    if (gpsDot) gpsDot.className = 'gps-pulse-dot';
  };

  navigator.geolocation.getCurrentPosition(handlePosition, handleGpsError, gpsOptions);

  try {
    if (state.gpsWatchId) navigator.geolocation.clearWatch(state.gpsWatchId);
    state.gpsWatchId = navigator.geolocation.watchPosition(handlePosition, handleGpsError, gpsOptions);
  } catch (e) {}
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
      if (state.currentLocation) state.currentLocation.address = addr;
      if (reportModal && reportModal.classList.contains('active') && addressVal) {
        addressVal.textContent = addr;
      }
    }
  } catch (e) {}
}

function updateReportModalLocationUI() {
  if (!state.currentLocation || state.currentLocation.lat === 0) {
    if (latVal) latVal.textContent = '---';
    if (lngVal) lngVal.textContent = '---';
    if (accVal) accVal.textContent = '--';
    if (addressVal) addressVal.textContent = 'جاري سحب اللوكيشن تلقائياً من GPS...';
    if (mapLinkBtn) {
      mapLinkBtn.style.pointerEvents = 'none';
      mapLinkBtn.style.opacity = '0.5';
    }
    return;
  }

  if (latVal) latVal.textContent = state.currentLocation.lat.toFixed(5);
  if (lngVal) lngVal.textContent = state.currentLocation.lng.toFixed(5);
  if (accVal) accVal.textContent = state.currentLocation.accuracy;
  if (addressVal) addressVal.textContent = state.currentLocation.address || 'تم قفل الموقع بدقة GPS';
  if (mapLinkBtn) {
    mapLinkBtn.href = state.currentLocation.mapUrl;
    mapLinkBtn.style.pointerEvents = 'auto';
    mapLinkBtn.style.opacity = '1';
  }
}

// ==================== HEADER & UI UPDATES ====================
function updateHeaderUI() {
  const nextNum = getNextSequenceNumber();
  if (floatingNextTag) floatingNextTag.textContent = `صورة رقم ${nextNum}`;

  if (state.syncRoom) {
    if (roomCodeDisplay) roomCodeDisplay.textContent = `غرفة: ${state.syncRoom}`;
    if (leaveRoomBtn) leaveRoomBtn.style.display = 'inline-block';
    if (reportCountBadge) reportCountBadge.textContent = `${state.reports.length} بلاغ`;
  } else {
    if (roomCodeDisplay) roomCodeDisplay.textContent = 'غير متصل بغرفة';
    if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
    if (reportCountBadge) reportCountBadge.textContent = '0 بلاغ';
  }

  const resolvedCount = state.reports.filter(r => r.status === 'resolved').length;
  const unresolvedCount = state.reports.filter(r => r.status === 'unresolved').length;

  if (countAll) countAll.textContent = state.reports.length;
  if (countResolved) countResolved.textContent = resolvedCount;
  if (countUnresolved) countUnresolved.textContent = unresolvedCount;

  updateConnectedMembersCountUI();
}

function showSystemLoader(durationMs = 600) {
  if (systemLoader) systemLoader.style.display = 'flex';
  if (reportsContainer) reportsContainer.style.opacity = '0.3';
  setTimeout(() => {
    if (systemLoader) systemLoader.style.display = 'none';
    if (reportsContainer) reportsContainer.style.opacity = '1';
  }, durationMs);
}

// ==================== CENTER SYSTEM FEED ====================
function renderReportsFeed() {
  if (!reportsContainer) return;
  reportsContainer.innerHTML = '';

  // 1. If user is NOT in any room (Left room) -> Show Empty Room State
  if (!state.syncRoom) {
    if (emptyRoomState) emptyRoomState.style.display = 'flex';
    if (emptyState) emptyState.style.display = 'none';
    if (emptyRoomState) reportsContainer.appendChild(emptyRoomState);
    return;
  }

  if (emptyRoomState) emptyRoomState.style.display = 'none';

  // 2. Filter reports
  const filtered = state.reports.filter(r => {
    if (state.activeFilter === 'resolved') return r.status === 'resolved';
    if (state.activeFilter === 'unresolved') return r.status === 'unresolved';
    return true;
  });

  if (filtered.length === 0) {
    if (emptyState) {
      emptyState.style.display = 'block';
      reportsContainer.appendChild(emptyState);
    }
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  filtered.forEach(report => {
    const card = document.createElement('div');
    card.className = `report-card status-${report.status}`;

    const isResolved = report.status === 'resolved';
    const statusText = isResolved ? '✅ تم الحل' : '❌ لم تُحل بعد';
    const toggleTargetText = isResolved ? 'تغيير: لم تحل' : 'تغيير: تم الحل';
    const deviceTag = report.device || 'جهاز ذكي';

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

  // Also update CarPlay feed if active
  if (carPlayOverlay && carPlayOverlay.style.display === 'flex') {
    renderCarPlayDashboard();
  }
}

// Toggle Report Status
window.toggleReportStatus = function(id) {
  const rep = state.reports.find(r => r.id === id);
  if (!rep) return;

  rep.status = rep.status === 'resolved' ? 'unresolved' : 'resolved';
  saveReportsForCurrentRoom();
  renderReportsFeed();

  if (navigator.onLine) {
    publishReportUpdate(rep);
  } else {
    rep.synced = false;
    saveReportsForCurrentRoom();
    renderReportsFeed();
  }
  showToast(`تم تحديث حالة صورة رقم ${rep.sequenceNumber}`);
};

// Delete Report
window.deleteReport = function(id) {
  if (confirm('هل أنت متأكد من حذف هذا البلاغ نهائياً من السيستم؟')) {
    state.reports = state.reports.filter(r => r.id !== id);
    saveReportsForCurrentRoom();
    renderReportsFeed();
    showToast('تم حذف البلاغ');
  }
};

// ==================== ROOM MANAGEMENT (LEAVE & JOIN) ====================
function leaveCurrentRoom() {
  if (!confirm('هل تريد الخروج من الغرفة الحالية؟ سيتم إخفاء بيانات السيستم حتى تدخل كود الغرفة مرة أخرى.')) {
    return;
  }

  state.syncRoom = '';
  localStorage.setItem(EXPLICIT_LEAVE_KEY, 'true');
  localStorage.removeItem(ROOM_KEY);
  state.reports = [];
  state.onlineMembers.clear();

  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  updateHeaderUI();
  renderReportsFeed();
  showToast('🚪 لقد خرجت من الغرفة. النظام معزول ولا يعرض أي بيانات الآن.');
}

function joinRoom(newRoomCode) {
  const cleanRoom = (newRoomCode || '').trim().toUpperCase();
  if (!cleanRoom) {
    showToast('يرجى كتابة كود الغرفة');
    return;
  }

  localStorage.removeItem(EXPLICIT_LEAVE_KEY);
  state.syncRoom = cleanRoom;
  localStorage.setItem(ROOM_KEY, cleanRoom);
  state.onlineMembers.clear();

  loadReportsForCurrentRoom();
  updateHeaderUI();
  showSystemLoader(700);
  renderReportsFeed();

  initRealtimeCloud();
  startPresenceHeartbeat();

  showToast(`✅ تم الدخول إلى الغرفة: ${cleanRoom}، جاري عرض بياناتها!`);
}

// ==================== APPLE CARPLAY DASHBOARD ====================
function openCarPlayMode() {
  if (!carPlayOverlay) return;
  carPlayOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  updateCarPlayClock();
  if (state.carPlayClockInterval) clearInterval(state.carPlayClockInterval);
  state.carPlayClockInterval = setInterval(updateCarPlayClock, 1000);

  renderCarPlayDashboard();
  showToast('🚗 تم تفعيل وضع شاشة السيارة Apple CarPlay');
}

function closeCarPlayMode() {
  if (!carPlayOverlay) return;
  carPlayOverlay.style.display = 'none';
  document.body.style.overflow = '';
  if (state.carPlayClockInterval) {
    clearInterval(state.carPlayClockInterval);
    state.carPlayClockInterval = null;
  }
}

function updateCarPlayClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  if (cpClock) cpClock.textContent = `${hours}:${minutes}`;
}

function renderCarPlayDashboard() {
  if (!carPlayFeed) return;

  if (!state.syncRoom) {
    if (cpRoomTitle) cpRoomTitle.textContent = 'غير متصل بغرفة';
    if (cpReportsText) cpReportsText.textContent = '0 بلاغات';
    if (cpMembersText) cpMembersText.textContent = '👥 0 متصل';
    carPlayFeed.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <h3>⚠️ لست منضماً لأي غرفة حالياً</h3>
        <p>يرجى الخروج من وضع السيارة والانضمام لغرفة لعرض العمليات على شاشة القيادة.</p>
      </div>
    `;
    return;
  }

  if (cpRoomTitle) cpRoomTitle.textContent = `غرفة: ${state.syncRoom}`;
  if (cpReportsText) cpReportsText.textContent = `📊 ${state.reports.length} بلاغ في السيستم`;
  if (cpMembersText) cpMembersText.textContent = `👥 ${state.onlineMembers.size + 1} متصل`;

  carPlayFeed.innerHTML = '';

  if (state.reports.length === 0) {
    carPlayFeed.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <h3>لا توجد عمليات مسجلة في هذه الغرفة</h3>
        <p>اضغط على زر (توثيق بلاغ جديد) للبدء</p>
      </div>
    `;
    return;
  }

  state.reports.forEach(report => {
    const isResolved = report.status === 'resolved';
    const statusText = isResolved ? 'تم الحل ✅' : 'لم تُحل ❌';

    const card = document.createElement('div');
    card.className = `cp-card ${report.status}`;
    card.innerHTML = `
      <div class="cp-card-left">
        <img src="${report.photo}" class="cp-card-thumb" alt="صورة ${report.sequenceNumber}">
        <div class="cp-card-info">
          <h4>صورة رقم ${report.sequenceNumber} • بواسطة ${escapeHtml(report.device || 'عضو')}</h4>
          <p>${escapeHtml(report.notes || (report.location ? report.location.address : '') || 'بدون تفاصيل')}</p>
        </div>
      </div>
      <div class="cp-card-right">
        <span class="cp-badge-status ${report.status}">${statusText}</span>
        <span style="font-size: 0.7rem; color: var(--text-muted);">${report.displayDate || 'الآن'}</span>
      </div>
    `;
    carPlayFeed.appendChild(card);
  });
}

function speakCarPlaySummary() {
  if (!('speechSynthesis' in window)) {
    showToast('النطق الصوتي غير مدعوم في هذا المتصفح');
    return;
  }

  window.speechSynthesis.cancel();

  if (!state.syncRoom || state.reports.length === 0) {
    const utter = new SpeechSynthesisUtterance('نظام العمليات. لا توجد بلاغات مسجلة حالياً في الغرفة.');
    utter.lang = 'ar-SA';
    window.speechSynthesis.speak(utter);
    return;
  }

  const unresolved = state.reports.filter(r => r.status === 'unresolved').length;
  const latest = state.reports[0];

  let text = `نظام العمليات الميداني. أنت في غرفة: ${state.syncRoom}. إجمالي البلاغات: ${state.reports.length}، منها ${unresolved} بلاغات لم تحل بعد. `;
  text += `آخر بلاغ مسجل هو صورة رقم ${latest.sequenceNumber}، مسجل بواسطة: ${latest.device}. `;
  if (latest.notes) {
    text += `الملاحظات: ${latest.notes}. `;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ar-SA';
  utterance.rate = 0.95;

  if (cpSpeakSubtext) cpSpeakSubtext.textContent = '🔊 جاري التحدث الآن...';
  utterance.onend = () => {
    if (cpSpeakSubtext) cpSpeakSubtext.textContent = 'استماع لملخص بلاغات الغرفة';
  };
  utterance.onerror = () => {
    if (cpSpeakSubtext) cpSpeakSubtext.textContent = 'استماع لملخص بلاغات الغرفة';
  };

  window.speechSynthesis.speak(utterance);
}

// ==================== PHOTO CAPTURE & SAVE WORKFLOW ====================
async function handlePhotoSelection(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!state.syncRoom) {
    showToast('⚠️ يرجى الانضمام إلى غرفة أولاً قبل توثيق البلاغات');
    openModal(welcomeModal);
    return;
  }

  showToast('جاري معالجة الصورة وقفل اللوكيشن...');

  try {
    const compressedBase64 = await compressImage(file, 1200, 0.75);
    state.currentPhotoData = compressedBase64;
    if (photoPreviewImg) photoPreviewImg.src = compressedBase64;

    const nextNum = getNextSequenceNumber();
    if (modalPhotoNumber) modalPhotoNumber.textContent = `صورة رقم ${nextNum}`;
    if (modalDeviceTag) modalDeviceTag.textContent = `📱 ${state.deviceName}`;

    if (problemNotes) problemNotes.value = '';
    const unresolvedRadio = document.querySelector('input[name="problemStatus"][value="unresolved"]');
    if (unresolvedRadio) unresolvedRadio.checked = true;

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
  const notes = problemNotes ? problemNotes.value.trim() : '';
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
    synced: isOnline
  };

  state.reports.unshift(newReport);
  saveReportsForCurrentRoom();
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

// ==================== REPORT DETAILS MODAL ====================
window.openReportDetails = function(reportId) {
  const report = state.reports.find(r => r.id === reportId);
  if (!report) return;

  state.currentViewingReportId = report.id;

  if (detailPhotoNum) detailPhotoNum.textContent = `صورة رقم ${report.sequenceNumber}`;
  if (detailDeviceName) detailDeviceName.textContent = report.device || 'غير معروف';

  const isUploaded = report.synced !== false;
  if (detailSyncBadge) {
    detailSyncBadge.className = isUploaded ? 'card-sync-tag synced' : 'card-sync-tag pending';
    detailSyncBadge.textContent = isUploaded ? 'نزلت في السيستم ✅' : 'لسه قيد الرفع ⏳';
  }

  if (detailPhotoImg) detailPhotoImg.src = report.photo;

  const isResolved = report.status === 'resolved';
  if (detailStatusPill) detailStatusPill.className = `detail-status-pill ${report.status}`;
  if (detailStatusText) detailStatusText.textContent = isResolved ? 'تم الحل ✅' : 'لم تُحل بعد ❌';

  if (detailNotesText) detailNotesText.textContent = report.notes ? report.notes : 'لا توجد ملاحظات إضافية مسجلة.';

  if (report.location && report.location.lat !== 0) {
    if (detailAddress) detailAddress.textContent = report.location.address || 'إحداثيات مسجلة';
    if (detailMapLink) {
      detailMapLink.href = report.location.mapUrl || `https://www.google.com/maps?q=${report.location.lat},${report.location.lng}`;
      detailMapLink.style.display = 'inline-flex';
    }
  } else {
    if (detailAddress) detailAddress.textContent = 'الموقع غير متوفر';
    if (detailMapLink) detailMapLink.style.display = 'none';
  }

  if (detailTime) detailTime.textContent = report.displayDate || 'الآن';
  if (detailToggleStatusBtn) {
    detailToggleStatusBtn.textContent = isResolved ? 'تغيير الحالة إلى: لم تُحل ❌' : 'تغيير الحالة إلى: تم الحل ✅';
  }

  openModal(detailModal);
};

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

  setInterval(() => {
    if (navigator.onLine && !state.isSyncingPending && state.syncRoom) {
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

  if (!networkStatusBar) return;

  if (!isOnline) {
    networkStatusBar.className = 'network-status-bar offline';
    networkStatusBar.style.display = 'flex';
    if (netStatusIcon) netStatusIcon.textContent = '📶';
    if (netStatusText) netStatusText.textContent = 'وضع عدم الاتصال (بدون إنترنت) - يتم حفظ العمليات محلياً ورفعها تلقائياً للسيستم عند الاتصال بالواي فاي';
  } else {
    if (pendingCount > 0 && !state.isSyncingPending) {
      networkStatusBar.className = 'network-status-bar syncing';
      networkStatusBar.style.display = 'flex';
      if (netStatusIcon) netStatusIcon.textContent = '🔄';
      if (netStatusText) netStatusText.textContent = `متصل بالإنترنت! جاري رفع ${pendingCount} بلاغ محفوظ إلى السيستم...`;
    } else if (!state.isSyncingPending) {
      networkStatusBar.style.display = 'none';
    }
  }
}

async function syncPendingReports() {
  if (state.isSyncingPending || !navigator.onLine || !state.syncRoom) return;

  const pending = state.reports.filter(r => r.synced === false);
  if (pending.length === 0) return;

  state.isSyncingPending = true;
  if (networkStatusBar) {
    networkStatusBar.className = 'network-status-bar syncing';
    networkStatusBar.style.display = 'flex';
    if (netStatusIcon) netStatusIcon.textContent = '🔄';
    if (netStatusText) netStatusText.textContent = `تم الاتصال بالإنترنت! جاري رفع ومزامنة ${pending.length} بلاغ إلى السيستم...`;
  }

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
  saveReportsForCurrentRoom();
  renderReportsFeed();

  if (successCount > 0) {
    if (networkStatusBar) {
      networkStatusBar.className = 'network-status-bar online-success';
      if (netStatusIcon) netStatusIcon.textContent = '✅';
      if (netStatusText) netStatusText.textContent = `تم بنجاح رفع ومزامنة ${successCount} عملية إلى السيستم!`;
    }
    playChimeSound();
    showToast(`🎉 تم الاتصال بالإنترنت ومزامنة ${successCount} عملية في السيستم!`);

    setTimeout(() => {
      if (networkStatusBar) networkStatusBar.style.display = 'none';
    }, 4000);
  }
}

// ==================== PRESENCE & ONLINE MEMBERS ====================
function startPresenceHeartbeat() {
  sendPresencePing();

  setInterval(() => {
    if (state.syncRoom) sendPresencePing();
  }, 12000);

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
  if (!state.syncRoom) return;

  const pingPayload = {
    type: 'PRESENCE_PING',
    deviceId: state.deviceId,
    deviceName: state.deviceName,
    room: state.syncRoom,
    timestamp: Date.now()
  };

  if (window.BroadcastChannel) {
    try {
      const channel = new BroadcastChannel('bc_' + state.syncRoom);
      channel.postMessage(pingPayload);
    } catch (e) {}
  }

  if (navigator.onLine) {
    const topic = getSyncTopic();
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify(pingPayload),
      headers: { 'Priority': 'min', 'Title': 'Presence Ping' }
    }).catch(() => {});
  }
}

function updateConnectedMembersCountUI() {
  const totalConnected = state.syncRoom ? (state.onlineMembers.size + 1) : 0;
  if (membersCountText) membersCountText.textContent = `👥 ${totalConnected} متصل`;

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

  const deviceName = report.device || 'جهاز آخر';
  const statusLabel = report.status === 'resolved' ? 'تم الحل ✅' : 'لم تُحل بعد ❌';

  if (notifTitle) notifTitle.textContent = `عملية جديدة مضافة من ${deviceName}!`;
  if (notifMeta) notifMeta.textContent = `صورة رقم ${report.sequenceNumber} • ${statusLabel}`;

  if (report.photo && notifThumbImg && notifThumbBox) {
    notifThumbImg.src = report.photo;
    notifThumbBox.style.display = 'block';
  } else if (notifThumbBox) {
    notifThumbBox.style.display = 'none';
  }

  if (inAppNotification) {
    inAppNotification.classList.add('show');
    inAppNotification.onclick = () => {
      inAppNotification.classList.remove('show');
      openReportDetails(report.id);
    };

    setTimeout(() => {
      inAppNotification.classList.remove('show');
    }, 7000);
  }

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
  if (!state.syncRoom) return;

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

    state.eventSource.onerror = () => {};
  } catch (err) {
    console.warn('Realtime SSE init failed:', err);
  }
}

function handleIncomingMessage(msg) {
  if (!msg || !msg.type) return;

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
  if (msg.report.deviceId === state.deviceId) return;

  if (msg.report.room && state.syncRoom && msg.report.room.toUpperCase() !== state.syncRoom.toUpperCase()) {
    return;
  }

  if (msg.type === 'NEW_REPORT') {
    const exists = state.reports.some(r => r.id === msg.report.id);
    if (!exists) {
      msg.report.synced = true;
      state.reports.unshift(msg.report);
      saveReportsForCurrentRoom();
      renderReportsFeed();
      triggerNewOperationNotification(msg.report);
    }
  } else if (msg.type === 'STATUS_UPDATE') {
    const existing = state.reports.find(r => r.id === msg.report.id);
    if (existing) {
      existing.status = msg.report.status;
      saveReportsForCurrentRoom();
      renderReportsFeed();
      showToast(`قام ${msg.report.device || 'جهاز آخر'} بتحديث حالة صورة رقم ${msg.report.sequenceNumber}`);
    }
  }
}

function publishReportToCloudAsync(report) {
  if (!state.syncRoom) return Promise.resolve();

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
      saveReportsForCurrentRoom();
      renderReportsFeed();
    })
    .catch((err) => {
      console.warn('Cloud publish failed (offline):', err);
      report.synced = false;
      saveReportsForCurrentRoom();
      renderReportsFeed();
    });
}

function publishReportUpdate(report) {
  if (!state.syncRoom) return;

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
    saveReportsForCurrentRoom();
    renderReportsFeed();
  });
}

// Helper to safely bind event listeners
function bindEvent(el, event, handler) {
  if (el) el.addEventListener(event, handler);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // 1. Floating Action Circle (Right Side)
  bindEvent(takePhotoBtn, 'click', () => {
    if (!state.syncRoom) {
      showToast('⚠️ يرجى الانضمام إلى غرفة أولاً قبل التصوير');
      openModal(welcomeModal);
      return;
    }
    if (cameraInput) {
      cameraInput.value = '';
      cameraInput.click();
    }
  });

  bindEvent(cameraInput, 'change', handlePhotoSelection);

  // Retake photo
  bindEvent(retakePhotoBtn, 'click', () => {
    if (cameraInput) {
      cameraInput.value = '';
      cameraInput.click();
    }
  });

  // Save report
  bindEvent(saveReportBtn, 'click', saveCurrentReport);

  // Close Report Modal
  bindEvent(cancelReportBtn, 'click', closeReportModal);
  bindEvent(closeModalBtn, 'click', closeReportModal);
  bindEvent(modalOverlay, 'click', closeReportModal);

  // Refresh GPS Location in Modal
  bindEvent(refreshLocationBtn, 'click', () => {
    showToast('جاري تحديث إحداثيات GPS...');
    startLiveLocationTracking();
  });

  // Leave room buttons (Header & Settings)
  bindEvent(leaveRoomBtn, 'click', leaveCurrentRoom);
  bindEvent(settingsLeaveRoomBtn, 'click', () => {
    closeModal(settingsModal);
    leaveCurrentRoom();
  });

  // Empty room join button
  bindEvent(joinOrCreateRoomBtn, 'click', () => {
    openModal(welcomeModal);
  });

  // 2. Filter Chips
  if (filterChips) {
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.activeFilter = chip.dataset.filter;
        renderReportsFeed();
      });
    });
  }

  // 3. Apple CarPlay Mode Toggles
  bindEvent(carPlayToggleBtn, 'click', openCarPlayMode);
  bindEvent(openCarPlayBtn, 'click', () => {
    closeModal(settingsModal);
    openCarPlayMode();
  });
  bindEvent(closeCarPlayBtn, 'click', closeCarPlayMode);

  bindEvent(cpNewReportBtn, 'click', () => {
    if (takePhotoBtn) takePhotoBtn.click();
  });
  bindEvent(cpSpeakBtn, 'click', speakCarPlaySummary);

  // 4. Apple Shortcuts Copy Buttons
  bindEvent(copyNewShortcutBtn, 'click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('systemapp://new').then(() => {
        showToast('📋 تم نسخ رابط الاختصار (systemapp://new)!');
      }).catch(() => {
        showToast('systemapp://new');
      });
    } else {
      showToast('systemapp://new');
    }
  });

  bindEvent(copyCarPlayShortcutBtn, 'click', () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('systemapp://carplay').then(() => {
        showToast('📋 تم نسخ رابط الاختصار (systemapp://carplay)!');
      }).catch(() => {
        showToast('systemapp://carplay');
      });
    } else {
      showToast('systemapp://carplay');
    }
  });

  // 5. Detail Modal
  bindEvent(closeDetailModalBtn, 'click', () => closeModal(detailModal));
  bindEvent(detailCloseBtn, 'click', () => closeModal(detailModal));
  bindEvent(detailModalOverlay, 'click', () => closeModal(detailModal));

  bindEvent(detailToggleStatusBtn, 'click', () => {
    if (state.currentViewingReportId) {
      toggleReportStatus(state.currentViewingReportId);
      openReportDetails(state.currentViewingReportId);
    }
  });

  // 6. Settings Modal (⚙️)
  bindEvent(openSettingsBtn, 'click', () => {
    if (settingsNameInput) settingsNameInput.value = state.deviceName;
    if (settingsRoomInput) settingsRoomInput.value = state.syncRoom;
    updateConnectedMembersCountUI();
    openModal(settingsModal);
  });

  bindEvent(closeSettingsModalBtn, 'click', () => closeModal(settingsModal));
  bindEvent(settingsModalOverlay, 'click', () => closeModal(settingsModal));

  bindEvent(saveSettingsNameBtn, 'click', () => {
    const customName = settingsNameInput ? settingsNameInput.value.trim() : '';
    if (customName) {
      state.deviceName = customName;
      localStorage.setItem(DEVICE_NAME_KEY, customName);
      sendPresencePing();
      updateConnectedMembersCountUI();
      showToast(`تم حفظ اسمك: ${customName}`);
    }
  });

  bindEvent(applySettingsRoomBtn, 'click', () => {
    const newRoom = settingsRoomInput ? settingsRoomInput.value.trim().toUpperCase() : '';
    if (newRoom && newRoom !== state.syncRoom) {
      joinRoom(newRoom);
      closeModal(settingsModal);
    } else {
      closeModal(settingsModal);
    }
  });

  bindEvent(enableNotifBtn, 'click', async () => {
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

  bindEvent(forceSyncBtn, 'click', () => {
    if (!navigator.onLine) {
      showToast('لا يوجد اتصال بالإنترنت حالياً');
      return;
    }
    syncPendingReports();
    showToast('جاري التحقق والمزامنة الفورية...');
  });

  bindEvent(exportDataBtn, 'click', exportReportsAsJson);
  bindEvent(importDataBtn, 'click', () => {
    if (importFileInput) importFileInput.click();
  });
  bindEvent(importFileInput, 'change', handleImportFile);

  // 7. Welcome Modal (First-Time Onboarding)
  if (welcomeRoomRadios) {
    welcomeRoomRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'new') {
          if (welcomeRoomCodeWrapper) welcomeRoomCodeWrapper.style.display = 'none';
        } else {
          if (welcomeRoomCodeWrapper) {
            welcomeRoomCodeWrapper.style.display = 'block';
            if (welcomeRoomInput) welcomeRoomInput.focus();
          }
        }
      });
    });
  }

  bindEvent(welcomeSubmitBtn, 'click', () => {
    const nameVal = welcomeNameInput ? welcomeNameInput.value.trim() : '';
    if (!nameVal) {
      showToast('يرجى كتابة اسمك أولاً');
      if (welcomeNameInput) welcomeNameInput.focus();
      return;
    }

    const roomTypeSelected = document.querySelector('input[name="welcomeRoomType"]:checked');
    const typeVal = roomTypeSelected ? roomTypeSelected.value : 'existing';
    let roomVal = '';

    if (typeVal === 'existing') {
      roomVal = (welcomeRoomInput && welcomeRoomInput.value.trim().toUpperCase()) || DEFAULT_ROOM;
    } else {
      roomVal = 'ROOM-' + Math.floor(1000 + Math.random() * 9000);
    }

    state.deviceName = nameVal;
    localStorage.setItem(DEVICE_NAME_KEY, nameVal);
    localStorage.setItem(SETUP_DONE_KEY, 'true');

    closeModal(welcomeModal);
    joinRoom(roomVal);
  });
}

// ==================== BACKUP & EXPORT ====================
function exportReportsAsJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.reports, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `system_reports_${state.syncRoom || 'all'}_${Date.now()}.json`);
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
        saveReportsForCurrentRoom();
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
  if (!modalEl) return;
  modalEl.classList.add('active');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('active');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function showToast(msg) {
  if (!toast) return;
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
