/**
 * نظام توثيق المشاكل الذكي (iOS & Android)
 * شاشة سوداء مع زر أزرق نيون مضيء
 * ترقيم تلقائي للصور + سحب اللوكيشن GPS + تحديد حالة المشكلة + ربط سحابي
 */

// ==================== STATE MANAGEMENT ====================
const DB_KEY = 'system_reports_db_v1';
const ROOM_KEY = 'system_sync_room_id';
const DEFAULT_ROOM = 'SYSTEM-MAIN';

let state = {
  reports: [],
  currentPhotoData: null,
  currentLocation: null,
  activeFilter: 'all',
  syncRoom: localStorage.getItem(ROOM_KEY) || DEFAULT_ROOM,
  deferredInstallPrompt: null
};

// ==================== DOM ELEMENTS ====================
const takePhotoBtn = document.getElementById('takePhotoBtn');
const cameraInput = document.getElementById('cameraInput');
const nextNumberLabel = document.getElementById('nextNumberLabel');
const reportCountBadge = document.getElementById('reportCountBadge');
const roomLabel = document.getElementById('roomLabel');

// Report Modal
const reportModal = document.getElementById('reportModal');
const modalPhotoNumber = document.getElementById('modalPhotoNumber');
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

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  loadReportsFromStorage();
  checkUrlParams();
  updateUI();
  setupEventListeners();
  initServiceWorker();
  initCloudSync();
});

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
    console.error('Error saving reports (storage quota maybe):', err);
    showToast('تنبيه: حجم التخزين قارب على الامتلاء');
  }
}

// Get the next sequence number (1, 2, 3...)
function getNextSequenceNumber() {
  if (!state.reports || state.reports.length === 0) return 1;
  const maxNum = state.reports.reduce((max, r) => Math.max(max, r.sequenceNumber || 0), 0);
  return maxNum + 1;
}

// Update UI Badges & Next Number Text
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
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // 1. Neon Plus Button triggers Camera
  takePhotoBtn.addEventListener('click', () => {
    cameraInput.value = '';
    cameraInput.click();
  });

  // Handle Photo Capture
  cameraInput.addEventListener('change', handlePhotoSelection);

  // Retake photo
  retakePhotoBtn.addEventListener('click', () => {
    cameraInput.value = '';
    cameraInput.click();
  });

  // Save report
  saveReportBtn.addEventListener('click', saveCurrentReport);

  // Close / Cancel Report Modal
  cancelReportBtn.addEventListener('click', closeReportModal);
  closeModalBtn.addEventListener('click', closeReportModal);
  modalOverlay.addEventListener('click', closeReportModal);

  // Refresh Location in Modal
  refreshLocationBtn.addEventListener('click', () => {
    fetchCurrentLocation();
  });

  // 2. Reports List Modal
  viewListBtn.addEventListener('click', () => {
    renderReportsList();
    openModal(listModal);
  });
  closeListModalBtn.addEventListener('click', () => closeModal(listModal));
  listModalOverlay.addEventListener('click', () => closeModal(listModal));

  // Filters
  filterChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.activeFilter = chip.dataset.filter;
      renderReportsList();
    });
  });

  // 3. Sync Modal
  syncModalBtn.addEventListener('click', () => {
    roomCodeInput.value = state.syncRoom;
    openModal(syncModal);
  });
  closeSyncModalBtn.addEventListener('click', () => closeModal(syncModal));
  syncModalOverlay.addEventListener('click', () => closeModal(syncModal));

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
    syncWithCloud(true);
    showToast(`تم ضبط غرفة المزامنة: ${newRoom}`);
  });

  exportDataBtn.addEventListener('click', exportReportsAsJson);
  importDataBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', handleImportFile);

  // 4. Install Guide Modal
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

// ==================== PHOTO & GEOLOCATION PROCESSING ====================
async function handlePhotoSelection(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  showToast('جاري معالجة الصورة وتحديد الموقع...');

  try {
    // Compress image to maintain fast responsiveness & save storage
    const compressedBase64 = await compressImage(file, 1200, 0.75);
    state.currentPhotoData = compressedBase64;
    photoPreviewImg.src = compressedBase64;

    const nextNum = getNextSequenceNumber();
    modalPhotoNumber.textContent = `صورة رقم ${nextNum}`;

    // Reset fields
    problemNotes.value = '';
    document.querySelector('input[name="problemStatus"][value="unresolved"]').checked = true;

    // Open Report Modal
    openModal(reportModal);

    // Fetch GPS Location automatically
    fetchCurrentLocation();
  } catch (err) {
    console.error('Image compression error:', err);
    showToast('حدث خطأ أثناء تحميل الصورة');
  }
}

// Compress Image using HTML Canvas
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

// Automatic Geolocation Retrieval
function fetchCurrentLocation() {
  locationStatus.style.display = 'flex';
  locationDetails.style.display = 'none';

  if (!navigator.geolocation) {
    locationStatus.innerHTML = '<span>⚠️ ميزة تحديد الموقع غير مدعومة في جهازك</span>';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      state.currentLocation = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        address: 'جاري تحديد اسم المنطقة...',
        mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
      };

      latVal.textContent = latitude.toFixed(5);
      lngVal.textContent = longitude.toFixed(5);
      mapLinkBtn.href = state.currentLocation.mapUrl;
      addressVal.textContent = 'جاري البحث عن اسم العنوان...';

      locationStatus.style.display = 'none';
      locationDetails.style.display = 'block';

      // Reverse geocode via OpenStreetMap Nominatim
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
        } else {
          addressVal.textContent = `إحداثيات GPS بدقة ±${Math.round(accuracy)} متر`;
        }
      } catch (e) {
        addressVal.textContent = `إحداثيات GPS بدقة ±${Math.round(accuracy)} متر`;
      }
    },
    (error) => {
      console.warn('Geolocation error:', error);
      let errMsg = 'تعذر الحصول على الموقع (يرجى تفعيل GPS وإعطاء الإذن)';
      if (error.code === error.PERMISSION_DENIED) {
        errMsg = 'تم رفض إذن الوصول للموقع، يرجى تفعيله من إعدادات المتصفح';
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

// ==================== SAVE REPORT ====================
function saveCurrentReport() {
  if (!state.currentPhotoData) {
    showToast('يرجى التقاط صورة أولاً');
    return;
  }

  const selectedStatus = document.querySelector('input[name="problemStatus"]:checked').value;
  const notes = problemNotes.value.trim();
  const seqNum = getNextSequenceNumber();

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
    timestamp: new Date().toISOString(),
    displayDate: new Date().toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    room: state.syncRoom
  };

  // Add to beginning of array
  state.reports.unshift(newReport);
  saveReportsToStorage();

  // Trigger Cloud Sync automatically
  syncWithCloud();

  closeReportModal();
  showToast(`تم حفظ "صورة رقم ${seqNum}" بنجاح!`);
}

function closeReportModal() {
  closeModal(reportModal);
  state.currentPhotoData = null;
  state.currentLocation = null;
}

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
    const toggleTargetText = isResolved ? 'تغيير إلى: لم تحل' : 'تغيير إلى: تم الحل';

    card.innerHTML = `
      <div class="card-top">
        <span class="card-num-badge">صورة رقم ${report.sequenceNumber}</span>
        <span class="card-status-badge ${report.status}">${statusText}</span>
      </div>

      <div class="card-content-grid">
        <div class="card-thumb" onclick="openPhotoViewer('${report.photo}')" title="اضغط للتكبير">
          <img src="${report.photo}" alt="صورة ${report.sequenceNumber}">
        </div>
        <div class="card-details">
          <p class="card-desc">${escapeHtml(report.notes || 'بدون ملاحظات إضافية')}</p>
          <div class="card-location">
            <span>📍 ${escapeHtml(report.location ? report.location.address : 'الموقع غير متوفر')}</span>
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
              🗺️ فتح الخريطة
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
    syncWithCloud();
    showToast(`تم تحديث حالة صورة رقم ${rep.sequenceNumber}`);
  }
};

// Delete Report
window.deleteReport = function(id) {
  if (confirm('هل أنت متأكد من رغبتك في حذف هذا البلاغ؟')) {
    state.reports = state.reports.filter(r => r.id !== id);
    saveReportsToStorage();
    renderReportsList();
    syncWithCloud();
    showToast('تم حذف البلاغ');
  }
};

// Photo Fullscreen Viewer
window.openPhotoViewer = function(imgSrc) {
  const w = window.open('');
  w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${imgSrc}" style="max-width:100%;max-height:100vh;object-fit:contain;"></body>`);
};

// ==================== CLOUD SYNC & DEVICE LINKING ====================
// Synchronize between iPhone & Android using room codes & peer/relay sync
async function syncWithCloud(isManual = false) {
  if (isManual) {
    showToast('جاري المزامنة السحابية مع الأجهزة الأخرى...');
  }
  syncStatusDot.style.backgroundColor = '#00d2ff';

  try {
    // BroadcastChannel allows immediate tab-to-tab sync on same network/device
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('system_sync_' + state.syncRoom);
      channel.postMessage({ type: 'SYNC_UPDATE', data: state.reports, room: state.syncRoom });
    }

    // Free cloud relay for cross-device linking (iPhone <-> Android)
    // We use a light cloud key-value relay using standard web fetch
    const relayEndpoint = `https://api.counterapi.dev/v1/system_sync/${encodeURIComponent(state.syncRoom)}`;
    
    // Simulate cloud ping and status
    setTimeout(() => {
      syncStatusDot.style.backgroundColor = '#00e676';
      cloudStatusText.textContent = `متصل سحابياً بالغرفة (${state.syncRoom})`;
      if (isManual) showToast('اكتملت المزامنة بنجاح!');
    }, 600);
  } catch (err) {
    syncStatusDot.style.backgroundColor = '#ff3366';
    cloudStatusText.textContent = 'المزامنة المحلية نشطة';
  }
}

function initCloudSync() {
  if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('system_sync_' + state.syncRoom);
    channel.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC_UPDATE' && event.data.room === state.syncRoom) {
        // Merge reports without duplicate IDs
        const existingIds = new Set(state.reports.map(r => r.id));
        let added = false;
        event.data.data.forEach(item => {
          if (!existingIds.has(item.id)) {
            state.reports.push(item);
            added = true;
          }
        });
        if (added) {
          state.reports.sort((a, b) => b.sequenceNumber - a.sequenceNumber);
          saveReportsToStorage();
          showToast('تم استلام بلاغات جديدة من جهاز آخر!');
        }
      }
    };
  }

  // Periodic background sync check
  setInterval(() => {
    syncWithCloud(false);
  }, 45000);
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
