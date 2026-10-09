// Profile popup toggle
function initProfilePopup() {
  const btn = document.getElementById('profileBtn');
  const popup = document.getElementById('profilePopup');
  if (!btn || !popup) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    popup.classList.toggle('open');
    btn.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    popup.classList.remove('open');
    btn.classList.remove('open');
  });
}

// Logout — always goes to home page
async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// Toast notification
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = (type === 'success' ? '✅ ' : '❌ ') + msg;
  t.className = `toast t-${type} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

// Status badge HTML
function statusBadge(status) {
  const map   = { 'Pending': 'badge-pending', 'In Progress': 'badge-progress', 'Resolved': 'badge-resolved' };
  const icons = { 'Pending': '⏳', 'In Progress': '⚙️', 'Resolved': '✅' };
  return `<span class="badge ${map[status] || ''}">${icons[status] || ''} ${status}</span>`;
}

// Format date
function fmtDate(dt) {
  return new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
