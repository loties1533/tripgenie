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

// ---- THEME TOGGLE ----
export function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

export function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  const icon = document.querySelector('.theme-icon');
  if (icon) icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  
  showToast(`Mode ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`);
}

// ---- MOOD BOARD ----
const MOODS = [
  { id: 'adventure', name: 'Aventure', img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80' },
  { id: 'relax',     name: 'Détente',  img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
  { id: 'culture',   name: 'Culture',  img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80' },
  { id: 'party',     name: 'Nightlife',img: 'https://images.unsplash.com/photo-1514525253361-b83f859b73c0?w=400&q=80' },
  { id: 'food',      name: 'Gastro',   img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80' },
  { id: 'luxury',    name: 'Luxe',     img: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80' }
];

export function renderMoodBoard() {
  const grid = document.getElementById('moodGrid');
  if (!grid) return;
  grid.innerHTML = MOODS.map(m => `
    <div class="mood-item" data-id="${m.id}" onclick="toggleMood(this)">
      <img src="${m.img}" alt="${m.name}">
      <div class="mood-check">✓</div>
      <div class="mood-item-overlay">
        <span class="mood-name">${m.name}</span>
      </div>
    </div>
  `).join('');
  document.getElementById('moodBoard').classList.add('active');
}

export function toggleMood(el) {
  el.classList.toggle('selected');
}

export function getSelectedMoods() {
  return Array.from(document.querySelectorAll('.mood-item.selected'))
    .map(el => el.dataset.id);
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