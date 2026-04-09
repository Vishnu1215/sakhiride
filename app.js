// ============================================
// SAKHI RIDE - Frontend JavaScript
// ============================================

const API = 'http://localhost:3000/api';
let currentUser = null;
let authToken = null;
let selectedRating = 0;

// ============ INIT ============
window.onload = () => {
  const savedToken = localStorage.getItem('sakhi_token');
  const savedUser = localStorage.getItem('sakhi_user');

  if (savedToken && savedUser) {
    authToken = savedToken;
    currentUser = JSON.parse(savedUser);
    showApp();
  } else {
    showAuth();
  }
};

// ============ AUTH UI ============
function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('nav-user-name').textContent = currentUser.name;
  document.getElementById('nav-user-role').textContent = currentUser.role;

  // Show role-specific dashboard
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  if (currentUser.role === 'admin') {
    document.getElementById('admin-dashboard').classList.add('active');
    loadAdminStats();
    loadAdminRiders();
  } else if (currentUser.role === 'rider') {
    document.getElementById('rider-dashboard').classList.add('active');
    document.getElementById('rider-name').textContent = currentUser.name;
    loadAvailableRides();
  } else {
    document.getElementById('passenger-dashboard').classList.add('active');
    document.getElementById('passenger-name').textContent = currentUser.name;
  }
}

function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.auth-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  clearAlert('auth-alert');
}

function selectRole(role, el) {
  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('reg-role').value = role;
  document.getElementById('rider-fields').classList.toggle('hidden', role !== 'rider');
}

// ============ AUTH ACTIONS ============
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    return showAlert('auth-alert', 'Please enter email and password', 'error');
  }

  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success) {
      authToken = res.token;
      currentUser = res.user;
      localStorage.setItem('sakhi_token', authToken);
      localStorage.setItem('sakhi_user', JSON.stringify(currentUser));
      showApp();
    } else {
      showAlert('auth-alert', res.message, 'error');
    }
  } catch (err) {
    showAlert('auth-alert', 'Connection error. Is the server running?', 'error');
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;

  if (!name || !email || !phone || !password) {
    return showAlert('auth-alert', 'Please fill all required fields', 'error');
  }
  if (password.length < 6) {
    return showAlert('auth-alert', 'Password must be at least 6 characters', 'error');
  }

  const body = { name, email, phone, password, role };

  if (role === 'rider') {
    body.vehicle_type = document.getElementById('reg-vehicle-type').value;
    body.vehicle_number = document.getElementById('reg-vehicle-number').value.trim();
    body.license_number = document.getElementById('reg-license').value.trim();
    if (!body.vehicle_type || !body.vehicle_number || !body.license_number) {
      return showAlert('auth-alert', 'Please fill vehicle details', 'error');
    }
  }

  try {
    const res = await apiCall('/auth/register', 'POST', body);
    if (res.success) {
      showAlert('auth-alert', res.message, 'success');
      setTimeout(() => switchAuthTab('login'), 2500);
    } else {
      showAlert('auth-alert', res.message, 'error');
    }
  } catch (err) {
    showAlert('auth-alert', 'Connection error. Is the server running?', 'error');
  }
}

function handleLogout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('sakhi_token');
  localStorage.removeItem('sakhi_user');
  showAuth();
}

// ============ PASSENGER TABS ============
function showPassengerTab(tab, el) {
  document.querySelectorAll('#passenger-dashboard .tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('#passenger-dashboard .page-tab').forEach(t => t.classList.remove('active'));

  document.getElementById(`passenger-${tab}`).classList.remove('hidden');
  if (el) el.classList.add('active');

  if (tab === 'my-rides') loadMyRides();
  if (tab === 'sos') loadSOSHistory();
}

// ============ BOOK RIDE ============
async function bookRide() {
  const pickup = document.getElementById('pickup-location').value.trim();
  const dropoff = document.getElementById('dropoff-location').value.trim();
  const scheduled = document.getElementById('scheduled-time').value;

  if (!pickup || !dropoff) {
    return showAlert('book-alert', 'Please enter pickup and dropoff locations', 'error');
  }

  try {
    const res = await apiCall('/rides/book', 'POST', {
      pickup_location: pickup,
      dropoff_location: dropoff,
      scheduled_time: scheduled || null
    });

    if (res.success) {
      showAlert('book-alert',
        `✅ Ride booked! Fare: ₹${res.ride.fare} | Distance: ~${res.ride.distance_km} km`,
        'success');
      document.getElementById('pickup-location').value = '';
      document.getElementById('dropoff-location').value = '';
      document.getElementById('scheduled-time').value = '';
    } else {
      showAlert('book-alert', res.message, 'error');
    }
  } catch (err) {
    showAlert('book-alert', 'Failed to book ride. Please try again.', 'error');
  }
}

// ============ MY RIDES (PASSENGER) ============
async function loadMyRides() {
  const container = document.getElementById('my-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your rides...</div>';

  try {
    const res = await apiCall('/rides/my-rides', 'GET');
    if (!res.success || res.rides.length === 0) {
      container.innerHTML = emptyState('🚗', 'No rides yet', 'Book your first ride to get started!');
      return;
    }

    container.innerHTML = `<div class="rides-grid">${res.rides.map(ride => rideCardHTML(ride, 'passenger')).join('')}</div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

function rideCardHTML(ride, viewAs) {
  const statusClass = ride.status;
  const timeAgo = formatDate(ride.created_at);
  let actionsHTML = '';

  if (viewAs === 'passenger') {
    if (ride.status === 'pending') {
      actionsHTML += `<button class="btn btn-danger btn-sm" onclick="cancelRide(${ride.id})">✕ Cancel</button>`;
    }
    if (ride.status === 'completed') {
      actionsHTML += `<button class="btn btn-primary btn-sm" onclick="openRatingModal(${ride.id})">⭐ Rate Ride</button>`;
    }
  }

  if (viewAs === 'rider') {
    if (ride.status === 'accepted') {
      actionsHTML += `<button class="btn btn-success btn-sm" onclick="updateRideStatus(${ride.id}, 'in_progress')">▶ Start Ride</button>`;
      actionsHTML += `<button class="btn btn-outline btn-sm" onclick="cancelRide(${ride.id})">✕ Release</button>`;
    }
    if (ride.status === 'in_progress') {
      actionsHTML += `<button class="btn btn-primary btn-sm" onclick="updateRideStatus(${ride.id}, 'completed')">✔ Complete</button>`;
    }
    if (ride.status === 'completed') {
      actionsHTML += `<button class="btn btn-primary btn-sm" onclick="openRatingModal(${ride.id})">⭐ Rate</button>`;
    }
  }

  const passengerInfo = ride.passenger_name ? `<span>👤 ${ride.passenger_name}</span>` : '';
  const riderInfo = ride.rider_name ? `<span>🏍️ ${ride.rider_name}</span>` : '<span>🔍 Searching rider...</span>';

  return `
    <div class="ride-card ${statusClass}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <strong style="font-size:15px;">Ride #${ride.id}</strong>
        <span class="badge badge-${ride.status}">${ride.status.replace('_', ' ')}</span>
      </div>

      <div class="ride-route">
        <div class="route-point">
          <div class="route-dot pickup"></div>
          <span>${ride.pickup_location}</span>
        </div>
        <div class="route-point">
          <div class="route-dot dropoff"></div>
          <span>${ride.dropoff_location}</span>
        </div>
      </div>

      <div class="ride-meta">
        <span>💰 ₹${ride.fare || 'TBD'}</span>
        <span>📏 ${ride.distance_km || '?'} km</span>
        <span>🕐 ${timeAgo}</span>
        ${viewAs === 'passenger' ? riderInfo : passengerInfo}
        ${ride.vehicle_number ? `<span>🚗 ${ride.vehicle_type} - ${ride.vehicle_number}</span>` : ''}
      </div>

      ${actionsHTML ? `<div class="ride-actions">${actionsHTML}</div>` : ''}
    </div>
  `;
}

// ============ RIDER DASHBOARD ============
function showRiderTab(tab, el) {
  document.querySelectorAll('#rider-dashboard .tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('#rider-dashboard .page-tab').forEach(t => t.classList.remove('active'));

  document.getElementById(`rider-${tab}`).classList.remove('hidden');
  if (el) el.classList.add('active');

  if (tab === 'available') loadAvailableRides();
  if (tab === 'my-rides') loadRiderRides();
}

async function loadAvailableRides() {
  const container = document.getElementById('available-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Checking for rides...</div>';

  try {
    const res = await apiCall('/rides/available', 'GET');
    if (!res.success || res.rides.length === 0) {
      container.innerHTML = emptyState('🔍', 'No rides available', 'Check back soon for new ride requests!');
      return;
    }

    container.innerHTML = `<div class="rides-grid">${res.rides.map(ride => availableRideCardHTML(ride)).join('')}</div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

function availableRideCardHTML(ride) {
  return `
    <div class="ride-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <strong>Ride #${ride.id}</strong>
        <span class="badge badge-pending">New Request</span>
      </div>

      <div class="ride-route">
        <div class="route-point">
          <div class="route-dot pickup"></div>
          <span>${ride.pickup_location}</span>
        </div>
        <div class="route-point">
          <div class="route-dot dropoff"></div>
          <span>${ride.dropoff_location}</span>
        </div>
      </div>

      <div class="ride-meta">
        <span>👤 ${ride.passenger_name}</span>
        <span>📞 ${ride.passenger_phone}</span>
        <span>💰 ₹${ride.fare}</span>
        <span>📏 ${ride.distance_km} km</span>
      </div>

      <div class="ride-actions">
        <button class="btn btn-success btn-sm" onclick="acceptRide(${ride.id})">✓ Accept Ride</button>
      </div>
    </div>
  `;
}

async function acceptRide(rideId) {
  try {
    const res = await apiCall(`/rides/${rideId}/accept`, 'PUT');
    if (res.success) {
      alert('✅ Ride accepted! The passenger will be notified.');
      loadAvailableRides();
    } else {
      alert('❌ ' + res.message);
    }
  } catch (err) {
    alert('Failed to accept ride. Please try again.');
  }
}

async function loadRiderRides() {
  const container = document.getElementById('rider-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your rides...</div>';

  try {
    const res = await apiCall('/rides/my-rides', 'GET');
    if (!res.success || res.rides.length === 0) {
      container.innerHTML = emptyState('🏍️', 'No rides yet', 'Accept your first ride to get started!');
      return;
    }
    container.innerHTML = `<div class="rides-grid">${res.rides.map(ride => rideCardHTML(ride, 'rider')).join('')}</div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function updateRideStatus(rideId, status) {
  try {
    const res = await apiCall(`/rides/${rideId}/status`, 'PUT', { status });
    if (res.success) {
      loadRiderRides();
    } else {
      alert('❌ ' + res.message);
    }
  } catch (err) {
    alert('Failed to update status.');
  }
}

async function cancelRide(rideId) {
  if (!confirm('Are you sure you want to cancel this ride?')) return;

  try {
    const res = await apiCall(`/rides/${rideId}/cancel`, 'PUT');
    if (res.success) {
      if (currentUser.role === 'passenger') loadMyRides();
      else loadRiderRides();
    } else {
      alert('❌ ' + res.message);
    }
  } catch (err) {
    alert('Failed to cancel ride.');
  }
}

// ============ SOS ============
async function triggerSOS() {
  if (!confirm('⚠️ Send SOS Emergency Alert?\n\nThis will alert our safety team immediately.')) return;

  const alertDiv = document.getElementById('sos-alert');

  try {
    let latitude = null, longitude = null;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      });
    }

    const res = await apiCall('/sos/trigger', 'POST', {
      location_text: 'Triggered from app',
      latitude,
      longitude
    });

    if (res.success) {
      showAlert('sos-alert', '🚨 SOS Alert Sent! Our safety team has been notified. Stay safe!', 'error');
      loadSOSHistory();
    } else {
      showAlert('sos-alert', res.message, 'error');
    }
  } catch (err) {
    showAlert('sos-alert', 'Failed to send SOS. Please call 112 immediately!', 'error');
  }
}

async function loadSOSHistory() {
  const container = document.getElementById('sos-history-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await apiCall('/sos/my-alerts', 'GET');
    if (!res.success || res.alerts.length === 0) {
      container.innerHTML = emptyState('✅', 'No alerts', 'No SOS alerts sent yet. Stay safe!');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Date & Time</th><th>Location</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${res.alerts.map(a => `
              <tr>
                <td>${a.id}</td>
                <td>${formatDate(a.created_at)}</td>
                <td>${a.location_text || 'Unknown'}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

// ============ RATINGS ============
function openRatingModal(rideId) {
  document.getElementById('rating-ride-id').value = rideId;
  document.getElementById('rating-modal').classList.remove('hidden');
  selectedRating = 0;
  document.querySelectorAll('.star').forEach(s => s.classList.remove('active'));
  document.getElementById('rating-feedback').value = '';
  clearAlert('rating-alert');
}

function closeRatingModal() {
  document.getElementById('rating-modal').classList.add('hidden');
}

function selectStar(val) {
  selectedRating = val;
  document.querySelectorAll('.star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

async function submitRating() {
  const rideId = document.getElementById('rating-ride-id').value;
  const feedback = document.getElementById('rating-feedback').value;

  if (selectedRating === 0) {
    return showAlert('rating-alert', 'Please select a star rating', 'error');
  }

  try {
    const res = await apiCall('/ratings', 'POST', {
      ride_id: rideId,
      rating: selectedRating,
      feedback
    });

    if (res.success) {
      showAlert('rating-alert', '⭐ Rating submitted! Thank you.', 'success');
      setTimeout(closeRatingModal, 1500);
    } else {
      showAlert('rating-alert', res.message, 'error');
    }
  } catch (err) {
    showAlert('rating-alert', 'Failed to submit rating.', 'error');
  }
}

// ============ ADMIN ============
function showAdminTab(tab, el) {
  document.querySelectorAll('#admin-dashboard .tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('#admin-dashboard .page-tab').forEach(t => t.classList.remove('active'));

  document.getElementById(`admin-${tab}`).classList.remove('hidden');
  if (el) el.classList.add('active');

  if (tab === 'riders') loadAdminRiders();
  if (tab === 'users') loadAdminUsers();
  if (tab === 'rides') loadAdminRides();
  if (tab === 'sos') loadAdminSOS();
}

async function loadAdminStats() {
  const container = document.getElementById('admin-stats-grid');
  try {
    const res = await apiCall('/admin/stats', 'GET');
    if (!res.success) return;
    const s = res.stats;
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon orange">👥</div>
        <div><div class="stat-value">${s.total_users}</div><div class="stat-label">Total Users</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">🧑‍💼</div>
        <div><div class="stat-value">${s.total_passengers}</div><div class="stat-label">Passengers</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">🏍️</div>
        <div><div class="stat-value">${s.total_riders}</div><div class="stat-label">Riders</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">⏳</div>
        <div><div class="stat-value">${s.pending_riders}</div><div class="stat-label">Pending Approvals</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon blue">🚗</div>
        <div><div class="stat-value">${s.total_rides}</div><div class="stat-label">Total Rides</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div><div class="stat-value">${s.completed_rides}</div><div class="stat-label">Completed</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">🆘</div>
        <div><div class="stat-value">${s.active_sos}</div><div class="stat-label">Active SOS</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon red">📊</div>
        <div><div class="stat-value">${s.total_sos}</div><div class="stat-label">Total SOS</div></div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function loadAdminRiders() {
  const container = document.getElementById('admin-riders-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await apiCall('/admin/users', 'GET');
    const riders = res.users.filter(u => u.role === 'rider');

    const pending = riders.filter(r => !r.is_approved);
    const approved = riders.filter(r => r.is_approved);

    if (riders.length === 0) {
      container.innerHTML = emptyState('🏍️', 'No riders yet', 'No rider registrations found.');
      return;
    }

    container.innerHTML = `
      ${pending.length > 0 ? `
        <h4 style="margin-bottom:12px; color: var(--warning);">⏳ Pending Approval (${pending.length})</h4>
        <div class="table-wrap" style="margin-bottom:24px;">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>License</th><th>Actions</th></tr></thead>
            <tbody>
              ${pending.map(r => `
                <tr>
                  <td>${r.name}<br><small style="color:var(--text-light)">${r.email}</small></td>
                  <td>${r.phone}</td>
                  <td>${r.vehicle_type || '-'} / ${r.vehicle_number || '-'}</td>
                  <td>${r.license_number || '-'}</td>
                  <td>
                    <button class="btn btn-success btn-sm" onclick="approveRider(${r.id})">✓ Approve</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>` : '<div class="alert alert-success">✅ No pending approvals!</div>'}

      <h4 style="margin-bottom:12px; color: var(--success);">✅ Approved Riders (${approved.length})</h4>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${approved.map(r => `
              <tr>
                <td>${r.name}</td>
                <td>${r.phone}</td>
                <td>${r.vehicle_type || '-'} (${r.vehicle_number || '-'})</td>
                <td><span class="badge badge-approved">Approved</span></td>
                <td><button class="btn btn-danger btn-sm" onclick="rejectRider(${r.id})">✕ Deactivate</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function approveRider(id) {
  try {
    const res = await apiCall(`/admin/approve-rider/${id}`, 'PUT');
    if (res.success) { alert('✅ Rider approved!'); loadAdminRiders(); loadAdminStats(); }
    else alert('❌ ' + res.message);
  } catch (err) { alert('Failed to approve rider.'); }
}

async function rejectRider(id) {
  if (!confirm('Deactivate this rider?')) return;
  try {
    const res = await apiCall(`/admin/reject-rider/${id}`, 'PUT');
    if (res.success) { alert('Rider deactivated.'); loadAdminRiders(); }
    else alert('❌ ' + res.message);
  } catch (err) { alert('Failed.'); }
}

async function loadAdminUsers() {
  const container = document.getElementById('admin-users-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await apiCall('/admin/users', 'GET');
    if (!res.success || res.users.length === 0) {
      container.innerHTML = emptyState('👥', 'No users', '');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th></tr></thead>
          <tbody>
            ${res.users.map(u => `
              <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.phone}</td>
                <td><span class="badge badge-${u.role}">${u.role}</span></td>
                <td><span class="badge ${u.is_approved ? 'badge-approved' : 'badge-pending'}">${u.is_approved ? 'Active' : 'Pending'}</span></td>
                <td>${formatDate(u.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function loadAdminRides() {
  const container = document.getElementById('admin-rides-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await apiCall('/admin/rides', 'GET');
    if (!res.success || res.rides.length === 0) {
      container.innerHTML = emptyState('🚗', 'No rides yet', '');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Passenger</th><th>Rider</th><th>Pickup</th><th>Dropoff</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            ${res.rides.map(r => `
              <tr>
                <td>${r.id}</td>
                <td>${r.passenger_name}</td>
                <td>${r.rider_name || '-'}</td>
                <td style="max-width:150px; word-break:break-word">${r.pickup_location}</td>
                <td style="max-width:150px; word-break:break-word">${r.dropoff_location}</td>
                <td>₹${r.fare || '-'}</td>
                <td><span class="badge badge-${r.status}">${r.status.replace('_',' ')}</span></td>
                <td>${formatDate(r.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function loadAdminSOS() {
  const container = document.getElementById('admin-sos-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';

  try {
    const res = await apiCall('/admin/sos-alerts', 'GET');
    if (!res.success || res.alerts.length === 0) {
      container.innerHTML = emptyState('✅', 'No SOS alerts', 'All is safe!');
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>User</th><th>Phone</th><th>Location</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${res.alerts.map(a => `
              <tr>
                <td>${a.id}</td>
                <td>${a.user_name}</td>
                <td>${a.user_phone}</td>
                <td>${a.location_text || 'Unknown'}</td>
                <td><span class="badge badge-${a.status}">${a.status}</span></td>
                <td>${formatDate(a.created_at)}</td>
                <td>
                  ${a.status === 'active'
                    ? `<button class="btn btn-success btn-sm" onclick="resolveSOS(${a.id})">✓ Resolve</button>`
                    : '<span style="color:var(--success)">✅ Resolved</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = errorState();
  }
}

async function resolveSOS(id) {
  try {
    const res = await apiCall(`/admin/sos-alerts/${id}/resolve`, 'PUT');
    if (res.success) { loadAdminSOS(); loadAdminStats(); }
    else alert('❌ ' + res.message);
  } catch (err) { alert('Failed.'); }
}

// ============ HELPERS ============
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };

  if (authToken) options.headers['Authorization'] = `Bearer ${authToken}`;
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API}${endpoint}`, options);
  return await res.json();
}

function showAlert(containerId, message, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `${icons[type] || ''} ${message}`;
  el.classList.remove('hidden');
  if (type === 'success') {
    setTimeout(() => { el.classList.add('hidden'); }, 5000);
  }
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) { el.className = 'hidden'; el.innerHTML = ''; }
}

function emptyState(icon, title, text) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${text}</p>
    </div>`;
}

function errorState() {
  return `<div class="alert alert-error">❌ Failed to load data. Please refresh and try again.</div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
