// ==================== UTILITY FUNCTIONS ====================
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function sortRecords(records, sortBy = 'createdAt-desc') {
  const [sortKey, sortOrder] = sortBy.split('-');
  const sorted = [...records];
  
  sorted.sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    
    if (sortKey === 'name') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  return sorted;
}

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
const btnDeleteRecord = document.getElementById('btn-delete-record');
const btnEditRecord = document.getElementById('btn-edit-record');

// Additional UI elements
const recordCount = document.getElementById('record-count');
const sortSelect = document.getElementById('sort-select');
const loadingIndicator = document.getElementById('loading-indicator');
const entryTitle = document.getElementById('entry-title');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

let currentActiveRecordId = null;
let currentEditingRecordId = null;
let allRecords = [];
let currentSort = 'createdAt-desc';

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
    procNo: document.getElementById('entry-procNo').value,
    hosUpdatedPer: document.getElementById('entry-hosUpdatedPer').value,
    hosUpdatedTerm: document.getElementById('entry-hosUpdatedTerm').value,
    hosUpdatedTotal: document.getElementById('entry-hosUpdatedTotal').value,
    sanctionedPostPer: document.getElementById('entry-sanctionedPostPer').value,
    sanctionedPostTerm: document.getElementById('entry-sanctionedPostTerm').value,
    sanctionedPostTotal: document.getElementById('entry-sanctionedPostTotal').value,
    filled: document.getElementById('entry-filled').value,
    vacant: document.getElementById('entry-vacant').value,
    name: document.getElementById('entry-name').value,
    dob: document.getElementById('entry-dob').value,
    option: document.getElementById('entry-option').value,
    modeOfAppointment: document.getElementById('entry-modeOfAppointment').value,
    year: document.getElementById('entry-year').value,
    rank: document.getElementById('entry-rank').value,
    designation: document.getElementById('entry-designation').value,
    nativeDistrict: document.getElementById('entry-nativeDistrict').value,
    nativeTaluk: document.getElementById('entry-nativeTaluk').value,
    gender: document.getElementById('entry-gender').value,
    section: document.getElementById('entry-section').value,
    dateOfJoining: document.getElementById('entry-dateOfJoining').value,
    subDivision: document.getElementById('entry-subDivision').value,
    division: document.getElementById('entry-division').value,
    circle: document.getElementById('entry-circle').value,
    region: document.getElementById('entry-region').value,
    remarks: document.getElementById('entry-remarks').value,
    email: document.getElementById('entry-email').value,
    phone: document.getElementById('entry-phone').value,
  };

  const msg = document.getElementById('entry-msg');
  msg.className = '';
  msg.textContent = 'Saving...';

  try {
    let res;
    
    if (currentEditingRecordId) {
      // Update existing record
      res = await apiCall(`/api/records/${currentEditingRecordId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      // Create new record
      res = await apiCall('/api/records', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    if (!res) return;

    const data = await res.json();
    if (data.success) {
      const isEdit = currentEditingRecordId ? true : false;
      console.log(`✅ Record ${isEdit ? 'updated' : 'saved'} successfully:`, data.record);
      msg.textContent = `Record ${isEdit ? 'updated' : 'saved'} successfully!`;
      msg.className = 'success-text';
      entryForm.reset();
      currentEditingRecordId = null;
      entryTitle.textContent = 'Enter New Record';
      btnCancelEdit.style.display = 'none';
      console.log('⏱️ Waiting 1.5s before switching to dashboard...');
      setTimeout(() => {
        console.log('🔄 Switching to dashboard...');
        showView('dashboard');
      }, 1500);
    } else {
      // Handle different error formats
      let errorMsg = data.error || 'Unknown error';
      if (data.errors && Array.isArray(data.errors)) {
        errorMsg = data.errors.join(', ');
      }
      msg.textContent = "Failed to save: " + errorMsg;
      msg.className = 'error-text';
    }
  } catch (error) {
    msg.textContent = "Server error. Could not connect.";
    msg.className = 'error-text';
  }
});

// Cancel edit handler
btnCancelEdit.addEventListener('click', (e) => {
  e.preventDefault();
  currentEditingRecordId = null;
  entryForm.reset();
  entryTitle.textContent = 'Enter New Record';
  btnCancelEdit.style.display = 'none';
  const msg = document.getElementById('entry-msg');
  msg.textContent = '';
  showView('dashboard');
});

// ==================== FETCH & DISPLAY RECORDS ====================
async function fetchRecords() {
  console.log('📥 fetchRecords() called');
  recordsGrid.innerHTML = '<p>Loading records...</p>';
  try {
    const res = await apiCall('/api/records');
    
    if (!res) {
      console.log('❌ No response from API');
      return;
    }

    const data = await res.json();
    console.log('✅ Received data:', JSON.stringify(data, null, 2));
    
    const records = data.records || [];
    allRecords = records;

    console.log('📊 Displaying', records.length, 'records');
    
    if (records.length === 0) {
      recordsGrid.innerHTML = '<p style="color:var(--text-sub)">No records found. Click "Add New" to create one.</p>';
      return;
    }

    displayRecords(records);
  } catch (e) {
    console.error('❌ Error fetching records:', e);
    recordsGrid.innerHTML = '<p class="error-text">Failed to fetch records: ' + e.message + '</p>';
  }
}

// Display records in grid
function displayRecords(records) {
  recordsGrid.innerHTML = '';
  loadingIndicator.style.display = 'none';
  
  // Update record count
  recordCount.textContent = `Total: ${records.length}`;
  
  if (records.length === 0) {
    recordsGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-sub);"><p style="font-size: 1.1rem; margin: 0;">📭 No records found</p><p style="font-size: 0.95rem; margin: 10px 0 0 0;">Click "Add New" to create your first record</p></div>';
    return;
  }

  records.forEach(r => {
    const el = document.createElement('div');
    el.className = 'record-card';
    const date = formatDate(r.createdAt);
    el.innerHTML = `
      <div>
        <div class="record-name">${r.name}</div>
        <div class="record-meta">📅 ${date}</div>
        ${r.email ? `<div class="record-meta">📧 ${r.email}</div>` : ''}
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
    const sorted = sortRecords(allRecords, currentSort);
    displayRecords(sorted);
    return;
  }

  const filtered = allRecords.filter(r => 
    r.name.toLowerCase().includes(query) || 
    (r.email && r.email.toLowerCase().includes(query)) || 
    (r.phone && r.phone.toLowerCase().includes(query))
  );
  const sorted = sortRecords(filtered, currentSort);
  displayRecords(sorted);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchBtn.click();
  }
});

// Sorting functionality
sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  const query = searchInput.value.toLowerCase().trim();
  
  if (query === '') {
    const sorted = sortRecords(allRecords, currentSort);
    displayRecords(sorted);
  } else {
    const filtered = allRecords.filter(r => 
      r.name.toLowerCase().includes(query) || 
      (r.email && r.email.toLowerCase().includes(query)) || 
      (r.phone && r.phone.toLowerCase().includes(query))
    );
    const sorted = sortRecords(filtered, currentSort);
    displayRecords(sorted);
  }
});

// ==================== EXPORT ALL ====================
const exportAllBtn = document.getElementById('export-all-btn');
if (exportAllBtn) {
  exportAllBtn.addEventListener('click', async () => {
    try {
      console.log('📥 Exporting all records to Excel...');
      exportAllBtn.textContent = '⏳ Exporting...';
      exportAllBtn.disabled = true;
      
      const res = await fetch('/api/export/all-excel', {
        headers: tokenManager.getAuthHeader()
      });
      
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }
      
      const blob = await res.blob();
      console.log('✅ Received blob:', blob.size, 'bytes');
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      
      const fileName = `all-records-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = fileName;
      link.click();
      
      window.URL.revokeObjectURL(blobUrl);
      console.log('✅ Excel export completed:', fileName);
      
      exportAllBtn.textContent = 'Export All';
      exportAllBtn.disabled = false;
    } catch (err) {
      console.error('❌ Export error:', err);
      alert('Failed to export records: ' + err.message);
      exportAllBtn.textContent = ' Export All';
      exportAllBtn.disabled = false;
    }
  });
}

// ==================== MODAL ====================
function openModal(record) {
  currentActiveRecordId = record._id;
  modalName.textContent = record.name;
  
  modalBody.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">Basic Information</h5>
      <div class="data-row">
        <div class="data-label">Proc. No.</div>
        <div class="data-value">${record.procNo || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Date of Birth</div>
        <div class="data-value">${record.dob || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Gender</div>
        <div class="data-value">${record.gender || 'N/A'}</div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">Position Information</h5>
      <div class="data-row">
        <div class="data-label">Designation</div>
        <div class="data-value">${record.designation || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Rank</div>
        <div class="data-value">${record.rank || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Option</div>
        <div class="data-value">${record.option || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Mode of Appointment</div>
        <div class="data-value">${record.modeOfAppointment || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Section</div>
        <div class="data-value">${record.section || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Year</div>
        <div class="data-value">${record.year || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Date of Joining</div>
        <div class="data-value">${record.dateOfJoining || 'N/A'}</div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">HOS & Sanctioned Post</h5>
      <div class="data-row">
        <div class="data-label">HOS Updated - Per</div>
        <div class="data-value">${record.hosUpdatedPer || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">HOS Updated - Term</div>
        <div class="data-value">${record.hosUpdatedTerm || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">HOS Updated - Total</div>
        <div class="data-value">${record.hosUpdatedTotal || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Sanctioned Post - Per</div>
        <div class="data-value">${record.sanctionedPostPer || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Sanctioned Post - Term</div>
        <div class="data-value">${record.sanctionedPostTerm || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Sanctioned Post - Total</div>
        <div class="data-value">${record.sanctionedPostTotal || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Filled</div>
        <div class="data-value">${record.filled || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Vacant</div>
        <div class="data-value">${record.vacant || 'N/A'}</div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">Location Information</h5>
      <div class="data-row">
        <div class="data-label">Native District</div>
        <div class="data-value">${record.nativeDistrict || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Native Taluk</div>
        <div class="data-value">${record.nativeTaluk || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Division</div>
        <div class="data-value">${record.division || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Circle</div>
        <div class="data-value">${record.circle || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Sub Division</div>
        <div class="data-value">${record.subDivision || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Region</div>
        <div class="data-value">${record.region || 'N/A'}</div>
      </div>
    </div>

    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">Contact Information</h5>
      <div class="data-row">
        <div class="data-label">Email</div>
        <div class="data-value">${record.email || 'N/A'}</div>
      </div>
      <div class="data-row">
        <div class="data-label">Phone</div>
        <div class="data-value">${record.phone || 'N/A'}</div>
      </div>
    </div>

    ${record.remarks ? `
    <div style="margin-bottom: 20px;">
      <h5 style="color: var(--primary-color); margin-bottom: 10px;">Remarks</h5>
      <div class="data-value" style="padding: 10px; background: var(--bg-sub); border-radius: 5px;">${record.remarks}</div>
    </div>
    ` : ''}
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

// ==================== EDIT ====================
if (btnEditRecord) {
  btnEditRecord.addEventListener('click', async () => {
    if (!currentActiveRecordId) {
      alert('No record selected');
      return;
    }

    try {
      // Find the record to edit
      const recordToEdit = allRecords.find(r => r._id === currentActiveRecordId);
      if (!recordToEdit) {
        alert('Record not found');
        return;
      }

      // Populate form with record data
      document.getElementById('entry-procNo').value = recordToEdit.procNo || '';
      document.getElementById('entry-hosUpdatedPer').value = recordToEdit.hosUpdatedPer || '';
      document.getElementById('entry-hosUpdatedTerm').value = recordToEdit.hosUpdatedTerm || '';
      document.getElementById('entry-hosUpdatedTotal').value = recordToEdit.hosUpdatedTotal || '';
      document.getElementById('entry-sanctionedPostPer').value = recordToEdit.sanctionedPostPer || '';
      document.getElementById('entry-sanctionedPostTerm').value = recordToEdit.sanctionedPostTerm || '';
      document.getElementById('entry-sanctionedPostTotal').value = recordToEdit.sanctionedPostTotal || '';
      document.getElementById('entry-filled').value = recordToEdit.filled || '';
      document.getElementById('entry-vacant').value = recordToEdit.vacant || '';
      document.getElementById('entry-name').value = recordToEdit.name || '';
      document.getElementById('entry-dob').value = recordToEdit.dob || '';
      document.getElementById('entry-option').value = recordToEdit.option || '';
      document.getElementById('entry-modeOfAppointment').value = recordToEdit.modeOfAppointment || '';
      document.getElementById('entry-year').value = recordToEdit.year || '';
      document.getElementById('entry-rank').value = recordToEdit.rank || '';
      document.getElementById('entry-designation').value = recordToEdit.designation || '';
      document.getElementById('entry-nativeDistrict').value = recordToEdit.nativeDistrict || '';
      document.getElementById('entry-nativeTaluk').value = recordToEdit.nativeTaluk || '';
      document.getElementById('entry-gender').value = recordToEdit.gender || '';
      document.getElementById('entry-section').value = recordToEdit.section || '';
      document.getElementById('entry-dateOfJoining').value = recordToEdit.dateOfJoining || '';
      document.getElementById('entry-subDivision').value = recordToEdit.subDivision || '';
      document.getElementById('entry-division').value = recordToEdit.division || '';
      document.getElementById('entry-circle').value = recordToEdit.circle || '';
      document.getElementById('entry-region').value = recordToEdit.region || '';
      document.getElementById('entry-remarks').value = recordToEdit.remarks || '';
      document.getElementById('entry-email').value = recordToEdit.email || '';
      document.getElementById('entry-phone').value = recordToEdit.phone || '';

      // Update UI for edit mode
      currentEditingRecordId = currentActiveRecordId;
      entryTitle.textContent = `Edit Record: ${recordToEdit.name}`;
      btnCancelEdit.style.display = 'inline-block';
      const msg = document.getElementById('entry-msg');
      msg.textContent = '';

      // Close modal and switch to edit view
      detailsModal.classList.add('hidden');
      currentActiveRecordId = null;
      showView('entry');
    } catch (error) {
      console.error('Error loading record for edit:', error);
      alert('Error loading record for editing');
    }
  });
}

// ==================== EXPORT ====================
btnExcel.addEventListener('click', async () => {
  if (!currentActiveRecordId) {
    alert('No record selected');
    return;
  }
  
  try {
    const token = tokenManager.getToken();
    const url = `/api/export/excel/${currentActiveRecordId}`;
    console.log('📥 Requesting Excel export from:', url);
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Export failed with status ${res.status}: ${errorData.message || ''}`);
    }
    
    const blob = await res.blob();
    console.log('✅ Received blob:', blob.size, 'bytes');
    
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `record-${currentActiveRecordId}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    console.log('✅ Excel export completed');
  } catch (err) {
    console.error('❌ Excel export error:', err);
    alert('Failed to export to Excel: ' + err.message);
  }
});

btnWord.addEventListener('click', async () => {
  if (!currentActiveRecordId) {
    alert('No record selected');
    return;
  }
  
  try {
    const token = tokenManager.getToken();
    const url = `/api/export/word/${currentActiveRecordId}`;
    console.log('📥 Requesting Word export from:', url);
    
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', res.status, res.statusText);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(`Export failed with status ${res.status}: ${errorData.message || ''}`);
    }
    
    const blob = await res.blob();
    console.log('✅ Received blob:', blob.size, 'bytes');
    
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `record-${currentActiveRecordId}.docx`;
    link.click();
    window.URL.revokeObjectURL(blobUrl);
    console.log('✅ Word export completed');
  } catch (err) {
    console.error('❌ Word export error:', err);
    alert('Failed to export to Word: ' + err.message);
  }
});

// ==================== DELETE ====================
if (btnDeleteRecord) {
  btnDeleteRecord.addEventListener('click', async () => {
    if (!currentActiveRecordId) {
      console.log('❌ No record selected to delete');
      alert('No record selected');
      return;
    }
    
    console.log('🗑️ Attempting to delete record:', currentActiveRecordId);
    
    if (!confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      console.log('❌ Delete cancelled by user');
      return;
    }
    
    try {
      const recordId = currentActiveRecordId;
      console.log('📤 Sending DELETE request for:', recordId);
      
      const res = await apiCall(`/api/records/${recordId}`, {
        method: 'DELETE'
      });
      
      if (!res) {
        console.log('❌ No response from API');
        alert('Failed to delete record: No response from server');
        return;
      }
      
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.success) {
        console.log('✅ Record deleted successfully:', recordId);
        detailsModal.classList.add('hidden');
        currentActiveRecordId = null;
        await fetchRecords();
        alert('Record deleted successfully');
      } else {
        console.log('❌ Delete failed:', data.message);
        alert('Failed to delete record: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('❌ Error deleting record:', err);
      alert('Error deleting record: ' + err.message);
    }
  });
} else {
  console.error('❌ Delete button not found in HTML');
}

// ==================== INITIALIZE ====================
// Skip login - go directly to dashboard
showView('dashboard');
