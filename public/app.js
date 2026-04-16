// ==================== TOKEN MANAGEMENT ====================
class TokenManager {
  constructor() {
    this.tokenKey = 'auth_token';
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }

  hasToken() {
    return !!this.getToken();
  }

  getAuthHeader() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

const tokenManager = new TokenManager();

// ==================== API HELPER ====================
async function apiCall(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...tokenManager.getAuthHeader(),
      ...options.headers
    }
  };

  const config = { ...defaultOptions, ...options };
  const res = await fetch(endpoint, config);

  // If 401, token expired - continue anyway (no login required)
  if (res.status === 401) {
    tokenManager.clearToken();
    return null;
  }

  return res;
}

// ==================== DOM ELEMENTS ====================
const loginView = document.getElementById('login-view');
const mainShell = document.getElementById('main-app-shell');
const entryView = document.getElementById('entry-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const entryForm = document.getElementById('entry-form');
const recordsGrid = document.getElementById('records-grid');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');

// Password Toggle
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('toggle-password');

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePasswordBtn.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
  });
}

// Navigation Elements
const navDashboard = document.getElementById('nav-dashboard');
const navAdd = document.getElementById('nav-add');
const navLogout = document.getElementById('nav-logout');

// Modal Elements
const detailsModal = document.getElementById('details-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalName = document.getElementById('modal-name');
const modalBody = document.getElementById('modal-body');
const btnExcel = document.getElementById('btn-export-excel');
const btnWord = document.getElementById('btn-export-word');

let currentActiveRecordId = null;
let allRecords = [];

// ==================== ROUTING ====================
function showView(viewName) {
  // Hide all
  loginView.classList.add('hidden');
  entryView.classList.add('hidden');
  dashboardView.classList.add('hidden');
  detailsModal.classList.add('hidden');
  
  navDashboard.classList.remove('active');
  navAdd.classList.remove('active');

  if (viewName === 'login') {
    loginView.classList.remove('hidden');
    mainShell.classList.add('hidden');
  } else {
    mainShell.classList.remove('hidden');
    if (viewName === 'dashboard') {
      dashboardView.classList.remove('hidden');
      navDashboard.classList.add('active');
      fetchRecords(); // load data
    } else if (viewName === 'entry') {
      entryView.classList.remove('hidden');
      navAdd.classList.add('active');
    }
  }
}

// ==================== AUTHENTICATION ====================
// Login disabled - no authentication required
// (Login form removed - direct access to dashboard)

// Logout handler - reset and stay on dashboard
if (navLogout) {
  navLogout.addEventListener('click', () => {
    tokenManager.clearToken();
    allRecords = [];
    recordsGrid.innerHTML = '';
    showView('dashboard');
  });
}

// ==================== NAVIGATION ====================
navDashboard.addEventListener('click', () => showView('dashboard'));
navAdd.addEventListener('click', () => showView('entry'));

// ==================== DATA ENTRY ====================
entryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById('entry-name').value,
    dob: document.getElementById('entry-dob').value,
    address: document.getElementById('entry-address').value,
    email: document.getElementById('entry-email').value,
    phone: document.getElementById('entry-phone').value,
  };

  const msg = document.getElementById('entry-msg');
  msg.className = '';
  msg.textContent = 'Saving...';

  try {
    const res = await apiCall('/api/records', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res) return;

    const data = await res.json();
    if (data.success) {
      msg.textContent = "Record saved successfully!";
      msg.className = 'success-text';
      entryForm.reset();
      setTimeout(() => showView('dashboard'), 1500);
    } else {
      msg.textContent = "Failed to save: " + (data.error || JSON.stringify(data.errors));
      msg.className = 'error-text';
    }
  } catch (error) {
    msg.textContent = "Server error. Could not connect.";
    msg.className = 'error-text';
  }
});

// ==================== FETCH & DISPLAY RECORDS ====================
async function fetchRecords() {
  recordsGrid.innerHTML = '<p>Loading records...</p>';
  try {
    const res = await apiCall('/api/records');
    
    if (!res) return;

    const data = await res.json();
    const records = data.records || [];
    allRecords = records;

    if (records.length === 0) {
      recordsGrid.innerHTML = '<p style="color:var(--text-sub)">No records found. Click "Add New" to create one.</p>';
      return;
    }

    displayRecords(records);
  } catch (e) {
    recordsGrid.innerHTML = '<p class="error-text">Failed to fetch records.</p>';
  }
}

// Display records in grid
function displayRecords(records) {
  recordsGrid.innerHTML = '';
  if (records.length === 0) {
    recordsGrid.innerHTML = '<p style="color:var(--text-sub)">No records found.</p>';
    return;
  }

  records.forEach(r => {
    const el = document.createElement('div');
    el.className = 'record-card';
    const date = new Date(r.createdAt).toLocaleDateString();
    el.innerHTML = `
      <div>
        <div class="record-name">${r.name}</div>
        <div class="record-meta">Added: ${date}</div>
      </div>
      <div style="margin-top:15px; color:var(--primary); font-size:0.9rem; font-weight:600;">View Details &rarr;</div>
    `;
    el.addEventListener('click', () => openModal(r));
    recordsGrid.appendChild(el);
  });
}

// ==================== SEARCH ====================
searchBtn.addEventListener('click', () => {
  const query = searchInput.value.toLowerCase().trim();
  if (query === '') {
    displayRecords(allRecords);
    return;
  }

  const filtered = allRecords.filter(r => 
    r.name.toLowerCase().includes(query) || 
    (r.email && r.email.toLowerCase().includes(query)) || 
    (r.phone && r.phone.toLowerCase().includes(query))
  );
  displayRecords(filtered);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// ==================== MODAL ====================
function openModal(record) {
  currentActiveRecordId = record._id;
  modalName.textContent = record.name;
  
  modalBody.innerHTML = `
    <div class="data-row"><div class="data-label">Date of Birth</div><div class="data-value">${record.dob}</div></div>
    <div class="data-row"><div class="data-label">Address</div><div class="data-value">${record.address}</div></div>
    <div class="data-row"><div class="data-label">Email</div><div class="data-value">${record.email || 'N/A'}</div></div>
    <div class="data-row"><div class="data-label">Phone</div><div class="data-value">${record.phone || 'N/A'}</div></div>
  `;
  
  detailsModal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', () => {
  detailsModal.classList.add('hidden');
  currentActiveRecordId = null;
});

detailsModal.addEventListener('click', (e) => {
  if (e.target === detailsModal) {
    detailsModal.classList.add('hidden');
    currentActiveRecordId = null;
  }
});

// ==================== EXPORT ====================
btnExcel.addEventListener('click', () => {
  if (!currentActiveRecordId) return;
  const token = tokenManager.getToken();
  const url = `/api/export/excel/${currentActiveRecordId}`;
  
  fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.blob()).then(blob => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'export.xlsx';
    link.click();
    window.URL.revokeObjectURL(blobUrl);
  });
});

btnWord.addEventListener('click', () => {
  if (!currentActiveRecordId) return;
  const token = tokenManager.getToken();
  const url = `/api/export/word/${currentActiveRecordId}`;
  
  fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.blob()).then(blob => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'export.docx';
    link.click();
    window.URL.revokeObjectURL(blobUrl);
  });
});

// ==================== INITIALIZE ====================
// Skip login - go directly to dashboard
showView('dashboard');
