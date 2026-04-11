/* ============================================
   TRIPGENIE — js/ui.js
   ============================================ */

// ---- TOAST ----
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ---- TABS ----
export function switchTab(tabId, btn) {
  document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

// ---- TRIP TYPE ----
export function setTripType(type, btn, tripTypeRef) {
  tripTypeRef.value = type;
  document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const retField = document.getElementById('fieldReturn').closest('.field-group');
  retField.style.opacity = type === 'oneway' ? '0.4' : '1';
}

// ---- PREFERENCES ----
export function togglePref(btn) {
  btn.classList.toggle('selected');
}

export function getSelectedPrefs() {
  return Array.from(document.querySelectorAll('.pref-chip.selected'))
    .map(b => b.textContent.trim());
}

// ---- PRINT ----
export function printItinerary() {
  window.print();
}

// ---- SCROLL ----
export function scrollToSearch() {
  document.getElementById('searchCard').scrollIntoView({ behavior: 'smooth' });
}

// ---- INIT DATES ----
export function initDates() {
  const today = new Date();
  const dep = new Date(today);
  dep.setDate(dep.getDate() + 30);
  const ret = new Date(dep);
  ret.setDate(ret.getDate() + 7);
  document.getElementById('fieldDeparture').value = dep.toISOString().split('T')[0];
  document.getElementById('fieldReturn').value     = ret.toISOString().split('T')[0];
}

// ---- FORMAT DATE ----
export function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- LOADING DOTS ----
export function startLoadingDots() {
  const dotKeys = ['dot1', 'dot2', 'dot3', 'dot4', 'dot5'];
  let dotIdx = 0;
  const timer = setInterval(() => {
    if (dotIdx > 0) {
      const prev = document.getElementById(dotKeys[dotIdx - 1]);
      if (prev) prev.className = 'step-dot done';
    }
    if (dotIdx < dotKeys.length) {
      const cur = document.getElementById(dotKeys[dotIdx]);
      if (cur) cur.className = 'step-dot active';
      dotIdx++;
    }
  }, 1200);
  return timer;
}

// ---- STOP LOADING DOTS (manquait dans la version précédente) ----
export function stopLoadingDots(timer) {
  if (timer) clearInterval(timer);
  // Marque tous les dots comme "done" pour feedback visuel
  ['dot1', 'dot2', 'dot3', 'dot4', 'dot5'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'step-dot done';
  });
}