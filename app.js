// SAKHI RIDE - app.js COMPLETE FINAL VERSION
const API = '/api';
let currentUser = null, authToken = null, selectedRating = 0;
let audioCtx = null, isAlarmOn = false;

window.onload = () => {
  const savedToken = localStorage.getItem('sakhi_token');
  const savedUser = localStorage.getItem('sakhi_user');
  if (savedToken && savedUser) { authToken = savedToken; currentUser = JSON.parse(savedUser); showApp(); }
  else showAuth();
};

function showAuth() { document.getElementById('auth-section').classList.remove('hidden'); document.getElementById('app-section').classList.add('hidden'); }
function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('nav-user-name').textContent = currentUser.name;
  document.getElementById('nav-user-role').textContent = currentUser.role;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  if (currentUser.role === 'admin') { document.getElementById('admin-dashboard').classList.add('active'); loadAdminStats(); loadAdminRiders(); }
  else if (currentUser.role === 'rider') { document.getElementById('rider-dashboard').classList.add('active'); document.getElementById('rider-name').textContent = currentUser.name; loadAvailableRides(); }
  else { document.getElementById('passenger-dashboard').classList.add('active'); document.getElementById('passenger-name').textContent = currentUser.name; }
}
function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  document.querySelectorAll('.auth-tab').forEach((t, i) => { t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='register')); });
  clearAlert('auth-alert');
}
function selectRole(role, el) {
  document.querySelectorAll('.role-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('reg-role').value = role;
  document.getElementById('rider-fields').classList.toggle('hidden', role !== 'rider');
}
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAlert('auth-alert', 'Please enter email and password', 'error');
  try {
    const res = await apiCall('/auth/login', 'POST', { email, password });
    if (res.success) { authToken = res.token; currentUser = res.user; localStorage.setItem('sakhi_token', authToken); localStorage.setItem('sakhi_user', JSON.stringify(currentUser)); showApp(); }
    else showAlert('auth-alert', res.message, 'error');
  } catch (err) { showAlert('auth-alert', 'Connection error. Is the server running?', 'error'); }
}
async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const password = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const genderEl = document.getElementById('reg-gender');
  const gender = genderEl ? genderEl.value : 'female';
  if (!name||!email||!phone||!password) return showAlert('auth-alert','Please fill all required fields','error');
  if (password.length<6) return showAlert('auth-alert','Password must be at least 6 characters','error');
  if (gender&&gender!=='female') return showAlert('auth-alert','Sakhi Ride is exclusively for women.','error');
  const body = { name, email, phone, password, role, gender };
  if (role==='rider') {
    body.vehicle_type = document.getElementById('reg-vehicle-type').value;
    body.vehicle_number = document.getElementById('reg-vehicle-number').value.trim();
    body.license_number = document.getElementById('reg-license').value.trim();
    if (!body.vehicle_type||!body.vehicle_number||!body.license_number) return showAlert('auth-alert','Please fill vehicle details','error');
  }
  try {
    const res = await apiCall('/auth/register','POST',body);
    if (res.success) { showAlert('auth-alert',res.message,'success'); setTimeout(()=>switchAuthTab('login'),2500); }
    else showAlert('auth-alert',res.message,'error');
  } catch(err) { showAlert('auth-alert','Connection error.','error'); }
}
function handleLogout() { authToken=null; currentUser=null; localStorage.removeItem('sakhi_token'); localStorage.removeItem('sakhi_user'); showAuth(); }

function showPassengerTab(tab,el) {
  document.querySelectorAll('#passenger-dashboard .tab-content').forEach(t=>t.classList.add('hidden'));
  document.querySelectorAll('#passenger-dashboard .page-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('passenger-'+tab).classList.remove('hidden');
  if(el) el.classList.add('active');
  if(tab==='my-rides') loadMyRides();
  if(tab==='sos') { loadSOSHistory(); loadEmergencyContact(); }
}

async function bookRide() {
  const pickupEl = document.getElementById('pickup-location');
  const dropoffEl = document.getElementById('dropoff-location');
  const pickup = pickupEl.value.trim();
  const dropoff = dropoffEl.value.trim();
  const scheduled = document.getElementById('scheduled-time').value;
  if (!pickup||!dropoff) return showAlert('book-alert','Please enter pickup and dropoff locations','error');
  const body = {
    pickup_location: pickup, dropoff_location: dropoff, scheduled_time: scheduled||null,
    pickup_lat: pickupEl.dataset.lat||'', pickup_lng: pickupEl.dataset.lng||'',
    dropoff_lat: dropoffEl.dataset.lat||'', dropoff_lng: dropoffEl.dataset.lng||''
  };
  try {
    const res = await apiCall('/rides/book','POST',body);
    if (res.success) { showAlert('book-alert','Ride booked! Fare: ₹'+res.ride.fare+' | Distance: ~'+res.ride.distance_km+' km','success'); pickupEl.value=''; dropoffEl.value=''; pickupEl.dataset.lat=''; pickupEl.dataset.lng=''; dropoffEl.dataset.lat=''; dropoffEl.dataset.lng=''; document.getElementById('scheduled-time').value=''; }
    else showAlert('book-alert',res.message,'error');
  } catch(err) { showAlert('book-alert','Failed to book ride.','error'); }
}

async function loadMyRides() {
  const container = document.getElementById('my-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your rides...</div>';
  try {
    const res = await apiCall('/rides/my-rides','GET');
    if (!res.success||res.rides.length===0) { container.innerHTML = emptyState('🚗','No rides yet','Book your first ride to get started!'); return; }
    container.innerHTML = '<div class="rides-grid">'+res.rides.map(ride=>rideCardHTML(ride,'passenger')).join('')+'</div>';
  } catch(err) { container.innerHTML = errorState(); }
}

function rideCardHTML(ride, viewAs) {
  let actionsHTML = '';
  if (viewAs==='passenger') {
    if (ride.status==='pending') actionsHTML += '<button class="btn btn-danger btn-sm" onclick="cancelRide('+ride.id+')">✕ Cancel</button>';
    if (ride.status==='in_progress'||ride.status==='accepted') actionsHTML += '<button class="btn btn-outline btn-sm" onclick="window.open(\'/tracking.html?ride_id='+ride.id+'&role=passenger\',\'_blank\')">📍 Track</button>';
    if (ride.status==='in_progress') actionsHTML += '<button class="btn btn-outline btn-sm" onclick="shareRideLink('+ride.id+')">🔗 Share Live</button>';
    if (ride.status==='completed') {
      actionsHTML += '<button class="btn btn-primary btn-sm" onclick="openRatingModal('+ride.id+')">⭐ Rate Ride</button>';
      actionsHTML += '<button class="btn btn-outline btn-sm" onclick="downloadReceipt('+ride.id+',\''+encodeURIComponent(ride.pickup_location||'')+'\',\''+encodeURIComponent(ride.dropoff_location||'')+'\',\''+ride.fare+'\')">🧾 Receipt</button>';
    }
  }
  if (viewAs==='rider') {
    if (ride.status==='accepted') { actionsHTML += '<button class="btn btn-success btn-sm" onclick="showOTPEntry('+ride.id+')">🔐 Enter OTP & Start</button>'; actionsHTML += '<button class="btn btn-outline btn-sm" onclick="cancelRide('+ride.id+')">✕ Release</button>'; }
    if (ride.status==='in_progress') { actionsHTML += '<button class="btn btn-primary btn-sm" onclick="updateRideStatus('+ride.id+',\'completed\')">✔ Complete</button>'; actionsHTML += '<button class="btn btn-outline btn-sm" onclick="window.open(\'/tracking.html?ride_id='+ride.id+'&role=rider\',\'_blank\')">📍 Share Location</button>'; }
    if (ride.status==='completed') actionsHTML += '<button class="btn btn-primary btn-sm" onclick="openRatingModal('+ride.id+')">⭐ Rate</button>';
  }
  const riderInfo = ride.rider_name ? '<span>🏍️ '+ride.rider_name+'</span>' : '<span>🔍 Searching rider...</span>';
  const passengerInfo = ride.passenger_name ? '<span>👤 '+ride.passenger_name+'</span>' : '';
  let otpDisplay = '';
  if (viewAs==='passenger'&&ride.status==='accepted'&&ride.otp) {
    otpDisplay = '<div style="background:#f5eaf5;border:2px solid #8B1A8B;border-radius:10px;padding:12px 16px;margin-top:10px;text-align:center;"><div style="font-size:11px;color:#8B1A8B;font-weight:bold;margin-bottom:4px;">🔐 YOUR RIDE OTP</div><div style="font-size:32px;font-weight:bold;letter-spacing:10px;color:#8B1A8B;">'+ride.otp+'</div><div style="font-size:11px;color:#999;margin-top:4px;">Share with your verified Sakhi Ride driver only</div></div>';
  }
  return '<div class="ride-card '+ride.status+'"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;"><strong style="font-size:15px;">Ride #'+ride.id+'</strong><span class="badge badge-'+ride.status+'">'+ride.status.replace('_',' ')+'</span></div><div class="ride-route"><div class="route-point"><div class="route-dot pickup"></div><span>'+ride.pickup_location+'</span></div><div class="route-point"><div class="route-dot dropoff"></div><span>'+ride.dropoff_location+'</span></div></div><div class="ride-meta"><span>💰 ₹'+(ride.fare||'TBD')+'</span><span>📏 '+(ride.distance_km||'?')+' km</span><span>🕐 '+formatDate(ride.created_at)+'</span>'+(viewAs==='passenger'?riderInfo:passengerInfo)+(ride.vehicle_number?'<span>🚗 '+ride.vehicle_type+' - '+ride.vehicle_number+'</span>':'')+'</div>'+(actionsHTML?'<div class="ride-actions">'+actionsHTML+'</div>':'')+otpDisplay+'</div>';
}

function showRiderTab(tab,el) {
  document.querySelectorAll('#rider-dashboard .tab-content').forEach(t=>t.classList.add('hidden'));
  document.querySelectorAll('#rider-dashboard .page-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('rider-'+tab).classList.remove('hidden');
  if(el) el.classList.add('active');
  if(tab==='available') loadAvailableRides();
  if(tab==='my-rides') loadRiderRides();
}

async function loadAvailableRides() {
  const container = document.getElementById('available-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Checking for rides...</div>';
  try {
    const res = await apiCall('/rides/available','GET');
    if (!res.success||res.rides.length===0) { container.innerHTML = emptyState('🔍','No rides available','Check back soon for new ride requests!'); return; }
    container.innerHTML = '<div class="rides-grid">'+res.rides.map(ride=>availableRideCardHTML(ride)).join('')+'</div>';
  } catch(err) { container.innerHTML = errorState(); }
}

function availableRideCardHTML(ride) {
  return '<div class="ride-card"><div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;"><strong>Ride #'+ride.id+'</strong><span class="badge badge-pending">New Request</span></div><div class="ride-route"><div class="route-point"><div class="route-dot pickup"></div><span>'+ride.pickup_location+'</span></div><div class="route-point"><div class="route-dot dropoff"></div><span>'+ride.dropoff_location+'</span></div></div><div class="ride-meta"><span>👤 '+ride.passenger_name+'</span><span>📞 '+ride.passenger_phone+'</span><span>💰 ₹'+ride.fare+'</span><span>📏 '+ride.distance_km+' km</span></div><div class="ride-actions"><button class="btn btn-success btn-sm" onclick="acceptRide('+ride.id+')">✓ Accept Ride</button></div></div>';
}

async function acceptRide(rideId) {
  try {
    const res = await apiCall('/rides/'+rideId+'/accept','PUT');
    if (res.success) { showOTPEntry(rideId); loadAvailableRides(); }
    else alert('❌ '+res.message);
  } catch(err) { alert('Failed to accept ride.'); }
}

async function loadRiderRides() {
  const container = document.getElementById('rider-rides-list');
  container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading your rides...</div>';
  try {
    const res = await apiCall('/rides/my-rides','GET');
    if (!res.success||res.rides.length===0) { container.innerHTML = emptyState('🏍️','No rides yet','Accept your first ride!'); return; }
    container.innerHTML = '<div class="rides-grid">'+res.rides.map(ride=>rideCardHTML(ride,'rider')).join('')+'</div>';
  } catch(err) { container.innerHTML = errorState(); }
}

async function updateRideStatus(rideId, status) {
  try {
    const res = await apiCall('/rides/'+rideId+'/status','PUT',{status});
    if (res.success) { if(status==='completed') window.location.href='/payment.html?ride_id='+rideId; else loadRiderRides(); }
    else alert('❌ '+res.message);
  } catch(err) { alert('Failed to update status.'); }
}

async function cancelRide(rideId) {
  if (!confirm('Are you sure you want to cancel this ride?')) return;
  try {
    const res = await apiCall('/rides/'+rideId+'/cancel','PUT');
    if (res.success) { if(currentUser.role==='passenger') loadMyRides(); else loadRiderRides(); }
    else alert('❌ '+res.message);
  } catch(err) { alert('Failed to cancel ride.'); }
}

// OTP
function showOTPEntry(rideId) {
  const existing = document.getElementById('otp-modal'); if(existing) existing.remove();
  const modal = document.createElement('div'); modal.id='otp-modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML='<div style="background:white;border-radius:16px;padding:32px 28px;max-width:340px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);"><div style="font-size:48px;margin-bottom:12px;">🔐</div><h3 style="color:#8B1A8B;font-size:20px;margin-bottom:8px;">Verify OTP to Start Ride</h3><p style="color:#666;font-size:14px;margin-bottom:20px;">Ask the <strong>passenger</strong> for their 4-digit OTP.</p><input id="otp-input" type="number" placeholder="Enter 4-digit OTP" style="width:100%;padding:14px;text-align:center;font-size:24px;font-weight:bold;border:2px solid #ddd;border-radius:10px;outline:none;letter-spacing:8px;margin-bottom:16px;" oninput="if(this.value.length>4)this.value=this.value.slice(0,4)" onfocus="this.style.borderColor=\'#8B1A8B\'"><div id="otp-error" style="color:#dc2626;font-size:13px;margin-bottom:12px;display:none;"></div><button onclick="verifyOTPAndStart('+rideId+')" style="width:100%;background:#8B1A8B;color:white;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:bold;cursor:pointer;margin-bottom:10px;">✓ Verify & Start Ride</button><button onclick="document.getElementById(\'otp-modal\').remove()" style="width:100%;background:#f3f4f6;color:#555;border:none;padding:12px;border-radius:10px;font-size:14px;cursor:pointer;">Cancel</button></div>';
  document.body.appendChild(modal); document.getElementById('otp-input').focus();
}

async function verifyOTPAndStart(rideId) {
  const otp=document.getElementById('otp-input').value.trim(); const errEl=document.getElementById('otp-error');
  if(!otp||otp.length!==4) { errEl.textContent='Please enter the 4-digit OTP.'; errEl.style.display='block'; return; }
  errEl.style.display='none';
  try {
    const res=await apiCall('/otp/verify','POST',{ride_id:rideId,otp_entered:otp});
    if(res.success) { document.getElementById('otp-modal').remove(); alert('✅ OTP verified! Ride started.'); loadRiderRides(); }
    else { errEl.textContent=res.message||'Incorrect OTP.'; errEl.style.display='block'; document.getElementById('otp-input').value=''; document.getElementById('otp-input').focus(); }
  } catch(err) { errEl.textContent='Connection error.'; errEl.style.display='block'; }
}

// SOS
function createAlarmSound() {
  audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  function playBeep(f,d,t){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type='sawtooth';o.frequency.setValueAtTime(f,t);o.frequency.linearRampToValueAtTime(f*1.5,t+d/2);o.frequency.linearRampToValueAtTime(f,t+d);g.gain.setValueAtTime(1,t);g.gain.setValueAtTime(0,t+d);o.start(t);o.stop(t+d);}
  function sirLoop(){if(!isAlarmOn)return;const now=audioCtx.currentTime;playBeep(880,0.25,now);playBeep(440,0.25,now+0.25);setTimeout(sirLoop,500);}
  sirLoop();
}
function stopAlarm() { isAlarmOn=false; if(audioCtx){audioCtx.close();audioCtx=null;} const el=document.getElementById('sos-alert'); if(el) el.innerHTML='✅ Alarm stopped. Alert sent to safety team.'; }
async function triggerSOS() {
  if(!confirm('⚠️ Send SOS Emergency Alert?\n\nThis will sound an alarm and alert our safety team.')) return;
  isAlarmOn=true; createAlarmSound();
  const sosAlert=document.getElementById('sos-alert');
  if(sosAlert){sosAlert.className='alert alert-error';sosAlert.innerHTML='🚨 ALARM SOUNDING! SOS Alert Sent! Stay safe! <button onclick="stopAlarm()" style="margin-left:12px;padding:4px 12px;background:#333;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;">⏹ Stop Alarm</button>';sosAlert.classList.remove('hidden');}
  let lat=null,lng=null;
  try{const pos=await new Promise((res,rej)=>navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000}));lat=pos.coords.latitude;lng=pos.coords.longitude;}catch(e){}
  try{const res=await apiCall('/sos/trigger','POST',{location_text:'Triggered from app',latitude:lat,longitude:lng});if(!res.success)showAlert('sos-alert','Failed to send SOS. Call 112!','error');loadSOSHistory();}
  catch(err){showAlert('sos-alert','Failed to send SOS. Call 112!','error');}
}
async function loadSOSHistory() {
  const container=document.getElementById('sos-history-list'); if(!container) return;
  container.innerHTML='<div class="loading"><div class="spinner"></div>Loading...</div>';
  try {
    const res=await apiCall('/sos/my-alerts','GET');
    if(!res.success||res.alerts.length===0){container.innerHTML=emptyState('✅','No alerts','No SOS alerts sent yet. Stay safe!');return;}
    container.innerHTML='<div class="table-wrap"><table><thead><tr><th>#</th><th>Date & Time</th><th>Location</th><th>Status</th></tr></thead><tbody>'+res.alerts.map(a=>'<tr><td>'+a.id+'</td><td>'+formatDate(a.created_at)+'</td><td>'+(a.location_text||'Unknown')+'</td><td><span class="badge badge-'+a.status+'">'+a.status+'</span></td></tr>').join('')+'</tbody></table></div>';
  } catch(err) { container.innerHTML=errorState(); }
}

// Emergency Contact
async function saveEmergencyContact() {
  const name=document.getElementById('ec-name')?document.getElementById('ec-name').value.trim():'';
  const phone=document.getElementById('ec-phone')?document.getElementById('ec-phone').value.trim():'';
  if(!name||!phone) return showAlert('ec-alert','Please fill both fields','error');
  if(!/^\d{10}$/.test(phone)) return showAlert('ec-alert','Enter a valid 10-digit phone','error');
  try{const res=await apiCall('/users/emergency-contact','PUT',{emergency_contact_name:name,emergency_contact_phone:phone});if(res.success)showAlert('ec-alert','✅ Emergency contact saved!','success');else showAlert('ec-alert',res.message,'error');}
  catch(err){showAlert('ec-alert','Failed to save.','error');}
}
async function loadEmergencyContact() {
  try{const res=await apiCall('/users/emergency-contact','GET');if(res.success&&res.contact){const n=document.getElementById('ec-name');const p=document.getElementById('ec-phone');if(n&&res.contact.emergency_contact_name)n.value=res.contact.emergency_contact_name;if(p&&res.contact.emergency_contact_phone)p.value=res.contact.emergency_contact_phone;}}catch(err){}
}

// Ratings
function openRatingModal(rideId){document.getElementById('rating-ride-id').value=rideId;document.getElementById('rating-modal').classList.remove('hidden');selectedRating=0;document.querySelectorAll('.star').forEach(s=>s.classList.remove('active'));document.getElementById('rating-feedback').value='';clearAlert('rating-alert');}
function closeRatingModal(){document.getElementById('rating-modal').classList.add('hidden');}
function selectStar(val){selectedRating=val;document.querySelectorAll('.star').forEach(s=>{s.classList.toggle('active',parseInt(s.dataset.val)<=val);});}
async function submitRating(){
  const rideId=document.getElementById('rating-ride-id').value;const feedback=document.getElementById('rating-feedback').value;
  if(selectedRating===0) return showAlert('rating-alert','Please select a star rating','error');
  try{const res=await apiCall('/ratings','POST',{ride_id:rideId,rating:selectedRating,feedback});if(res.success){showAlert('rating-alert','⭐ Rating submitted!','success');setTimeout(closeRatingModal,1500);}else showAlert('rating-alert',res.message,'error');}
  catch(err){showAlert('rating-alert','Failed to submit rating.','error');}
}

// Receipt
function downloadReceipt(rideId,pickup,dropoff,fare){
  const win=window.open('','_blank');
  win.document.write('<!DOCTYPE html><html><head><title>Sakhi Ride Receipt #'+rideId+'</title><style>body{font-family:Arial,sans-serif;max-width:420px;margin:40px auto;padding:24px;color:#333;}.logo{text-align:center;color:#8B1A8B;font-size:26px;font-weight:bold;margin-bottom:4px;}.sub{text-align:center;color:#888;font-size:13px;margin-bottom:24px;}hr{border:none;border-top:1px dashed #ccc;margin:16px 0;}.row{display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px;}.label{color:#888;}.value{font-weight:bold;text-align:right;}.total{font-size:24px;font-weight:bold;color:#8B1A8B;text-align:center;margin:16px 0;padding:16px;background:#f8eef8;border-radius:10px;}.footer{text-align:center;color:#aaa;font-size:12px;margin-top:24px;line-height:1.6;}.btn{width:100%;padding:14px;background:#8B1A8B;color:white;border:none;border-radius:10px;font-size:15px;cursor:pointer;margin-top:16px;}@media print{.btn{display:none;}}</style></head><body><div class="logo">🌸 Sakhi Ride</div><div class="sub">Women-Only Ride Booking & Safety Platform</div><hr><div class="row"><span class="label">Receipt No.</span><span class="value">#SR-'+rideId+'</span></div><div class="row"><span class="label">Date</span><span class="value">'+new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})+'</span></div><div class="row"><span class="label">Status</span><span class="value" style="color:green">✓ Completed</span></div><hr><div class="row"><span class="label">📍 Pickup</span><span class="value">'+decodeURIComponent(pickup)+'</span></div><div class="row"><span class="label">🏁 Drop-off</span><span class="value">'+decodeURIComponent(dropoff)+'</span></div><hr><div class="total">₹'+fare+' <span style="font-size:14px;color:#888;font-weight:normal">Total Fare</span></div><hr><div class="footer">Thank you for choosing Sakhi Ride! 🌸<br>Your safety is our priority.</div><button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button></body></html>');
  win.document.close();
}

// Share Live
function shareRideLink(rideId){
  const url=window.location.origin+'/tracking.html?ride_id='+rideId+'&role=passenger';
  if(navigator.share){navigator.share({title:'Track my Sakhi Ride',text:'I am in a Sakhi Ride. Track my live location:',url});}
  else{navigator.clipboard.writeText(url).then(()=>alert('✅ Link copied!\nShare with family to track your ride.')).catch(()=>prompt('Copy this link:',url));}
}

// Admin
function showAdminTab(tab,el){
  document.querySelectorAll('#admin-dashboard .tab-content').forEach(t=>t.classList.add('hidden'));
  document.querySelectorAll('#admin-dashboard .page-tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('admin-'+tab).classList.remove('hidden');
  if(el) el.classList.add('active');
  if(tab==='riders') loadAdminRiders();
  if(tab==='users') loadAdminUsers();
  if(tab==='rides') loadAdminRides();
  if(tab==='sos') loadAdminSOS();
}

async function loadAdminStats(){
  const container=document.getElementById('admin-stats-grid');
  try{const res=await apiCall('/admin/stats','GET');if(!res.success)return;const s=res.stats;
  container.innerHTML='<div class="stat-card"><div class="stat-icon orange">👥</div><div><div class="stat-value">'+s.total_users+'</div><div class="stat-label">Total Users</div></div></div><div class="stat-card"><div class="stat-icon blue">🧑‍💼</div><div><div class="stat-value">'+s.total_passengers+'</div><div class="stat-label">Passengers</div></div></div><div class="stat-card"><div class="stat-icon green">🏍️</div><div><div class="stat-value">'+s.total_riders+'</div><div class="stat-label">Riders</div></div></div><div class="stat-card"><div class="stat-icon orange">⏳</div><div><div class="stat-value">'+s.pending_riders+'</div><div class="stat-label">Pending Approvals</div></div></div><div class="stat-card"><div class="stat-icon blue">🚗</div><div><div class="stat-value">'+s.total_rides+'</div><div class="stat-label">Total Rides</div></div></div><div class="stat-card"><div class="stat-icon green">✅</div><div><div class="stat-value">'+s.completed_rides+'</div><div class="stat-label">Completed</div></div></div><div class="stat-card"><div class="stat-icon red">🆘</div><div><div class="stat-value">'+s.active_sos+'</div><div class="stat-label">Active SOS</div></div></div><div class="stat-card"><div class="stat-icon red">📊</div><div><div class="stat-value">'+s.total_sos+'</div><div class="stat-label">Total SOS</div></div></div>';}
  catch(err){container.innerHTML=errorState();}
}

async function loadAdminRiders(){
  const container=document.getElementById('admin-riders-content');
  container.innerHTML='<div class="loading"><div class="spinner"></div>Loading...</div>';
  try{const res=await apiCall('/admin/users','GET');const riders=res.users.filter(u=>u.role==='rider');const pending=riders.filter(r=>!r.is_approved);const approved=riders.filter(r=>r.is_approved);
  if(riders.length===0){container.innerHTML=emptyState('🏍️','No riders yet','No rider registrations found.');return;}

  const pendingHTML=pending.length>0
    ?'<h4 style="margin-bottom:12px;color:var(--warning)">⏳ Pending Approval ('+pending.length+')</h4><div class="table-wrap" style="margin-bottom:24px;"><table><thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>License</th><th>ID Proof</th><th>Action</th></tr></thead><tbody>'
      +pending.map(r=>'<tr><td>'+r.name+'<br><small style="color:#888">'+r.email+'</small></td><td>'+r.phone+'</td><td>'+(r.vehicle_type||'-')+' / '+(r.vehicle_number||'-')+'</td><td>'+(r.license_number||'-')+'</td><td>'
        +(r.id_proof_filename
          ?'<button class="btn btn-outline btn-sm" onclick="viewIDProof('+r.id+',\''+r.name+'\')">🪪 View ID</button>'
          :'<span style="color:#bbb;font-size:12px">Not uploaded</span>')
        +'</td><td><button class="btn btn-success btn-sm" onclick="approveRider('+r.id+')">✓ Approve</button></td></tr>').join('')
      +'</tbody></table></div>'
    :'<div class="alert alert-success" style="margin-bottom:16px">✅ No pending approvals!</div>';

  const approvedHTML='<h4 style="margin-bottom:12px;color:green">✅ Approved Riders ('+approved.length+')</h4><div class="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>ID Proof</th><th>Status</th><th>Action</th></tr></thead><tbody>'
    +approved.map(r=>'<tr><td>'+r.name+'</td><td>'+r.phone+'</td><td>'+(r.vehicle_type||'-')+' ('+(r.vehicle_number||'-')+')</td><td>'
      +(r.id_proof_filename
        ?'<button class="btn btn-outline btn-sm" onclick="viewIDProof('+r.id+',\''+r.name+'\')">🪪 View ID</button>'
        :'<span style="color:#bbb;font-size:12px">Not uploaded</span>')
      +'</td><td><span class="badge badge-approved">Approved</span></td><td><button class="btn btn-danger btn-sm" onclick="rejectRider('+r.id+')">✕ Deactivate</button></td></tr>').join('')
    +'</tbody></table></div>';

  container.innerHTML=pendingHTML+approvedHTML;

  // Inject ID proof modal if not present
  if(!document.getElementById('id-proof-modal')){
    const modal=document.createElement('div');
    modal.id='id-proof-modal';
    modal.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center;';
    modal.innerHTML='<div style="background:#fff;border-radius:16px;padding:24px;max-width:680px;width:94%;max-height:90vh;overflow:auto;position:relative;">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">'
      +'<h3 id="id-proof-modal-title" style="margin:0;color:#8B1A8B">🪪 ID Proof Verification</h3>'
      +'<button onclick="closeIDProof()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">✕</button></div>'
      +'<div id="id-proof-content" style="text-align:center;min-height:200px;display:flex;align-items:center;justify-content:center;">'
      +'<div class="spinner"></div></div>'
      +'<div style="margin-top:16px;display:flex;gap:10px;justify-content:flex-end;">'
      +'<button class="btn btn-outline btn-sm" onclick="closeIDProof()">Close</button>'
      +'<a id="id-proof-download" href="#" download style="display:none"><button class="btn btn-primary btn-sm">⬇ Download</button></a>'
      +'</div></div>';
    document.body.appendChild(modal);
  }}
  catch(err){container.innerHTML=errorState();}
}

function viewIDProof(riderId, riderName){
  const modal=document.getElementById('id-proof-modal');
  const content=document.getElementById('id-proof-content');
  const title=document.getElementById('id-proof-modal-title');
  const dlBtn=document.getElementById('id-proof-download');
  title.textContent='🪪 ID Proof — '+riderName;
  content.innerHTML='<div class="spinner"></div>';
  dlBtn.style.display='none';
  modal.style.display='flex';
  const src=API+'/admin/rider-id-proof/'+riderId+'?token='+authToken;
  // Try as image first; if it fails (PDF), show as embed
  const img=new Image();
  img.onload=()=>{
    content.innerHTML='';
    img.style.cssText='max-width:100%;max-height:60vh;border-radius:8px;border:1px solid #eee;';
    content.appendChild(img);
    dlBtn.href=src; dlBtn.style.display='inline-block';
  };
  img.onerror=()=>{
    content.innerHTML='<embed src="'+src+'" type="application/pdf" width="100%" height="480px" style="border-radius:8px;border:1px solid #eee"/>';
    dlBtn.href=src; dlBtn.style.display='inline-block';
  };
  img.src=src;
}
function closeIDProof(){const m=document.getElementById('id-proof-modal');if(m)m.style.display='none';}

async function approveRider(id){try{const res=await apiCall('/admin/approve-rider/'+id,'PUT');if(res.success){alert('✅ Rider approved!');loadAdminRiders();loadAdminStats();}else alert('❌ '+res.message);}catch(err){alert('Failed.');}}
async function rejectRider(id){if(!confirm('Deactivate this rider?'))return;try{const res=await apiCall('/admin/reject-rider/'+id,'PUT');if(res.success)loadAdminRiders();else alert('❌ '+res.message);}catch(err){alert('Failed.');}}

async function loadAdminUsers(){
  const container=document.getElementById('admin-users-content');
  container.innerHTML='<div class="loading"><div class="spinner"></div>Loading...</div>';
  try{const res=await apiCall('/admin/users','GET');if(!res.success||res.users.length===0){container.innerHTML=emptyState('👥','No users','');return;}
  container.innerHTML='<div class="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>'+res.users.map(u=>'<tr><td>'+u.name+'</td><td>'+u.email+'</td><td>'+u.phone+'</td><td><span class="badge badge-'+u.role+'">'+u.role+'</span></td><td><span class="badge '+(u.is_approved?'badge-approved':'badge-pending')+'">'+(u.is_approved?'Active':'Pending')+'</span></td><td>'+formatDate(u.created_at)+'</td><td>'+(u.role!=='admin'?'<button class="btn btn-sm '+(u.is_blocked?'btn-success':'btn-danger')+'" onclick="toggleBlock('+u.id+','+(u.is_blocked?1:0)+')">'+(u.is_blocked?'🔓 Unblock':'🔒 Block')+'</button>':'-')+'</td></tr>').join('')+'</tbody></table></div>';}
  catch(err){container.innerHTML=errorState();}
}
async function toggleBlock(userId,currentlyBlocked){const action=currentlyBlocked?'unblock':'block';if(!confirm('Are you sure you want to '+action+' this user?'))return;try{const res=await apiCall('/admin/users/'+userId+'/block','PUT',{block:!currentlyBlocked});if(res.success){alert('✅ User '+action+'ed.');loadAdminUsers();}else alert('❌ '+res.message);}catch(err){alert('Failed.');}}

async function loadAdminRides(){
  const container=document.getElementById('admin-rides-content');
  container.innerHTML='<div class="loading"><div class="spinner"></div>Loading...</div>';
  try{const res=await apiCall('/admin/rides','GET');if(!res.success||res.rides.length===0){container.innerHTML=emptyState('🚗','No rides yet','');return;}
  container.innerHTML='<div class="table-wrap"><table><thead><tr><th>#</th><th>Passenger</th><th>Rider</th><th>Pickup</th><th>Dropoff</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>'+res.rides.map(r=>'<tr><td>'+r.id+'</td><td>'+r.passenger_name+'</td><td>'+(r.rider_name||'-')+'</td><td style="max-width:130px;word-break:break-word">'+r.pickup_location+'</td><td style="max-width:130px;word-break:break-word">'+r.dropoff_location+'</td><td>₹'+(r.fare||'-')+'</td><td><span class="badge badge-'+r.status+'">'+r.status.replace('_',' ')+'</span></td><td>'+formatDate(r.created_at)+'</td></tr>').join('')+'</tbody></table></div>';}
  catch(err){container.innerHTML=errorState();}
}

async function loadAdminSOS(){
  const container=document.getElementById('admin-sos-content');
  container.innerHTML='<div class="loading"><div class="spinner"></div>Loading...</div>';
  try{const res=await apiCall('/admin/sos-alerts','GET');if(!res.success||res.alerts.length===0){container.innerHTML=emptyState('✅','No SOS alerts','All is safe!');return;}
  container.innerHTML='<div class="table-wrap"><table><thead><tr><th>#</th><th>User</th><th>Phone</th><th>Location</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>'+res.alerts.map(a=>'<tr><td>'+a.id+'</td><td>'+a.user_name+'</td><td>'+a.user_phone+'</td><td>'+(a.location_text||'Unknown')+'</td><td><span class="badge badge-'+a.status+'">'+a.status+'</span></td><td>'+formatDate(a.created_at)+'</td><td>'+(a.status==='active'?'<button class="btn btn-success btn-sm" onclick="resolveSOS('+a.id+')">✓ Resolve</button>':'<span style="color:green">✅ Resolved</span>')+'</td></tr>').join('')+'</tbody></table></div>';}
  catch(err){container.innerHTML=errorState();}
}
async function resolveSOS(id){try{const res=await apiCall('/admin/sos-alerts/'+id+'/resolve','PUT');if(res.success){loadAdminSOS();loadAdminStats();}else alert('❌ '+res.message);}catch(err){alert('Failed.');}}

async function apiCall(endpoint,method='GET',body=null){
  const options={method,headers:{'Content-Type':'application/json'}};
  if(authToken) options.headers['Authorization']='Bearer '+authToken;
  if(body) options.body=JSON.stringify(body);
  const res=await fetch(API+endpoint,options);
  return await res.json();
}
function showAlert(containerId,message,type){const el=document.getElementById(containerId);if(!el)return;const icons={success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};el.className='alert alert-'+type;el.innerHTML=(icons[type]||'')+' '+message;el.classList.remove('hidden');if(type==='success')setTimeout(()=>{el.classList.add('hidden');},5000);}
function clearAlert(containerId){const el=document.getElementById(containerId);if(el){el.className='hidden';el.innerHTML='';}}
function emptyState(icon,title,text){return '<div class="empty-state"><div class="empty-icon">'+icon+'</div><h3>'+title+'</h3><p>'+text+'</p></div>';}
function errorState(){return '<div class="alert alert-error">❌ Failed to load data. Please refresh and try again.</div>';}
function formatDate(dateStr){if(!dateStr)return '-';const d=new Date(dateStr);return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}

let searchTimers={};
let userLat=17.385,userLng=78.4867; // default: Hyderabad center
if(navigator.geolocation){navigator.geolocation.getCurrentPosition(p=>{userLat=p.coords.latitude;userLng=p.coords.longitude;},()=>{});}

async function searchLocation(inputEl,dropdownId){
  const query=inputEl.value.trim();
  const dropdown=document.getElementById(dropdownId);
  if(query.length<2){dropdown.style.display='none';return;}
  clearTimeout(searchTimers[dropdownId]);
  searchTimers[dropdownId]=setTimeout(async()=>{
    dropdown.innerHTML='<div style="padding:10px 14px;color:#aaa;font-size:13px;text-align:center">🔍 Searching...</div>';
    dropdown.style.display='block';
    let results=[];
    // 1. Try Photon (best OSM-based autocomplete, no rate limits)
    try{
      const photonUrl='https://photon.komoot.io/api/?q='+encodeURIComponent(query)+'&limit=10&lang=en&lat='+userLat+'&lon='+userLng+'&zoom=12';
      const pr=await fetch(photonUrl,{signal:AbortSignal.timeout(4000)});
      const pj=await pr.json();
      results=(pj.features||[]).map(f=>{
        const p=f.properties||{};
        const name=p.name||p.street||'';
        const parts=[p.street&&p.street!==name?p.street:'',p.suburb||p.district||p.locality||'',p.city||p.county||'',p.state||''].filter(Boolean);
        const area=parts.filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,3).join(', ');
        const fullLabel=(name?name+', ':'')+area;
        return {name,area,fullLabel,lat:f.geometry.coordinates[1],lng:f.geometry.coordinates[0],type:p.osm_value||p.type||'place'};
      }).filter(r=>r.name||r.area);
    }catch(e){}

    // 2. Fallback to Nominatim if Photon returned < 3 results
    if(results.length<3){
      try{
        const nUrl='https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(query)
          +'&format=json&limit=8&addressdetails=1&countrycodes=in'
          +'&lat='+userLat+'&lon='+userLng;
        const nr=await fetch(nUrl,{headers:{'Accept-Language':'en','User-Agent':'SakhiRide/1.0'},signal:AbortSignal.timeout(5000)});
        const nj=await nr.json();
        const existing=new Set(results.map(r=>r.fullLabel.toLowerCase()));
        (nj||[]).forEach(place=>{
          const addr=place.address||{};
          const name=place.name||addr.road||addr.neighbourhood||addr.suburb||addr.amenity||'';
          const area=[addr.neighbourhood,addr.suburb,addr.city_district,addr.city||addr.town||addr.village].filter(Boolean).join(', ');
          const fullLabel=(name?name+(area?', ':''): '')+area;
          if(!existing.has(fullLabel.toLowerCase())&&fullLabel.trim()){results.push({name,area,fullLabel,lat:place.lat,lng:place.lon,type:place.type||'place'});}
        });
      }catch(e){}
    }

    // Deduplicate & render
    const seen=new Set();
    const unique=results.filter(r=>{const k=(r.fullLabel||'').toLowerCase().trim();if(!k||seen.has(k))return false;seen.add(k);return true;}).slice(0,10);

    dropdown.innerHTML='';
    if(unique.length===0){
      dropdown.innerHTML='<div style="padding:12px 14px;color:#aaa;font-size:13px;text-align:center">📭 No places found — try a nearby landmark</div>';
      return;
    }

    const typeIcons={'bus_stop':'🚌','hospital':'🏥','school':'🏫','college':'🎓','restaurant':'🍽️','cafe':'☕','temple':'🛕','mosque':'🕌','church':'⛪','railway':'🚆','station':'🚆','airport':'✈️','hotel':'🏨','mall':'🛍️','park':'🌳','pharmacy':'💊','bank':'🏦','atm':'💳','fuel':'⛽','police':'👮','market':'🛒','place':'📍'};
    const getIcon=t=>{for(const k in typeIcons)if((t||'').toLowerCase().includes(k))return typeIcons[k];return '📍';};

    unique.forEach(r=>{
      const item=document.createElement('div');
      item.style.cssText='padding:10px 14px;cursor:pointer;border-bottom:1px solid #f5eaf5;font-size:14px;transition:background .15s;';
      const icon=getIcon(r.type);
      const display=r.name?('<strong>'+r.name+'</strong>'+(r.area?'<br><small style="color:#888;margin-left:4px">'+r.area+'</small>':'')):'<strong>'+r.area+'</strong>';
      item.innerHTML='<span style="margin-right:8px">'+icon+'</span>'+display;
      item.onmousedown=e=>{e.preventDefault();inputEl.value=r.fullLabel.trim();inputEl.dataset.lat=r.lat||'';inputEl.dataset.lng=r.lng||'';dropdown.style.display='none';};
      item.onmouseover=()=>item.style.background='#f8eef8';
      item.onmouseout=()=>item.style.background='';
      dropdown.appendChild(item);
    });
  },300);
}
function closeDropdown(dropdownId){setTimeout(()=>{const d=document.getElementById(dropdownId);if(d)d.style.display='none';},200);}
