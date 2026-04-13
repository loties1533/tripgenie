/* ============================================
   TRIPGENIE — js/render.js
   ============================================ */

import { showToast, formatDate } from './ui.js';

// ---- Protection XSS ----
// Toutes les données de l'API passent par ici avant innerHTML
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ---- Point d'entrée principal ----
export function renderResults(d, params) {
  // Reset scroll
  window.scrollTo({ top: 0, behavior: 'instant' });

  renderHero(d);
  renderHeader(d, params);
  renderSummary(d, params);
  renderItinerary(d);
  renderFlights(d);
  renderHotels(d);
  renderActivities(d);
  renderEvents(d);
  renderBudget(d, params);
  renderTips(d);

  const section = document.getElementById('resultsSection');
  section.classList.add('active');
  
  // Petit délai pour laisser l'animation de la bannière se faire
  setTimeout(() => {
    document.getElementById('resHero').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ---- HERO BANNER ---- */
function renderHero(d) {
  const existing = document.getElementById('resHero');
  if (existing) existing.remove();

  const hero = document.createElement('div');
  hero.id = 'resHero';
  hero.className = 'res-hero';
  
  // Image dynamique Unsplash basée sur la destination
  // On utilise un mot clé de destination pour avoir une image pertinente
  // Fallback neutre (paysage de voyage) au lieu de Paris
  const fallbackImg = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80&fit=crop`; 
  
  // Utilisation de l'API Unsplash standard (Source est déprécié, on utilise l'URL images directe avec filtrage)
  const dynamicImg = `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&q=80&fit=crop`; // Paris par défaut si tout échoue
  
  // On construit une requête robuste avec un cache-buster (sig) pour éviter les doublons
  const rand = Math.floor(Math.random() * 1000);
  const searchUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(d.destination)},${encodeURIComponent(d.country || 'travel')},city&sig=${rand}`;
  
  hero.innerHTML = `
    <img src="${searchUrl}" class="res-hero-img" alt="${esc(d.destination)}" onerror="this.src='${fallbackImg}'">
    <div class="res-hero-content">
      <div class="res-hero-h1">${esc(d.destination)}</div>
      <div style="font-size:18px; opacity:0.9;">${esc(d.country || '')}</div>
    </div>
  `;

  const results = document.getElementById('resultsSection');
  results.prepend(hero);
}

/* ---- HEADER ---- */
function renderHeader(d, params) {
  document.getElementById('resTitle').textContent = `Voyage à ${d.destination}, ${d.country}`;
  document.getElementById('resMeta').innerHTML = `
    <span class="meta-tag">📅 ${esc(formatDate(params.departure))} → ${esc(formatDate(params.returnDate))}</span>
    <span class="meta-tag">⏱ ${esc(params.days)} jours</span>
    <span class="meta-tag">👥 ${esc(params.travelers)}</span>
    <span class="meta-tag">💰 ${esc(params.budget)}</span>
  `;
}

/* ---- SUMMARY CARDS ---- */
function renderSummary(d, params) {
  document.getElementById('summaryGrid').innerHTML = `
    <div class="summary-card glass-card">
      <span class="summary-icon">✈</span>
      <div class="summary-label">Budget total estimé</div>
      <div class="summary-value">${esc(d.summary?.total_budget || d.budget_breakdown?.total || '—')}</div>
    </div>
    <div class="summary-card glass-card">
      <span class="summary-icon">🌙</span>
      <div class="summary-label">Nuits d'hôtel</div>
      <div class="summary-value">${esc(d.summary?.nights || params.days - 1)}</div>
    </div>
    <div class="summary-card glass-card">
      <span class="summary-icon">🎭</span>
      <div class="summary-label">Activités planifiées</div>
      <div class="summary-value">${esc(d.activities?.length || d.summary?.activities_count || 0)}</div>
    </div>
    <div class="summary-card glass-card">
      <span class="summary-icon">🌡</span>
      <div class="summary-label">Météo prévue</div>
      <div class="summary-value">${esc(d.weather?.avg_temp || '—')}</div>
    </div>
  `;
}

/* ---- ITINERARY ---- */
function renderItinerary(d) {
  const BADGE = {
    flight:   { css: 'badge-flight',   label: '✈ Vol' },
    hotel:    { css: 'badge-hotel',    label: '🏨 Hôtel' },
    activity: { css: 'badge-activity', label: '🎭 Activité' },
    food:     { css: 'badge-food',     label: '🍽 Restaurant' },
    event:    { css: 'badge-event',    label: '🎉 Événement' }
  };

  let html = `
    <div class="prose-section">
      <h3>${esc(d.tagline || 'Votre voyage de rêve')}</h3>
      <p>${esc(d.overview || '')}</p>
      ${d.weather ? `
        <div class="weather-strip">
          <div class="weather-chip">🌡 ${esc(d.weather.avg_temp)}</div>
          <div class="weather-chip">☁ ${esc(d.weather.conditions)}</div>
          <div class="weather-chip">💡 ${esc(d.weather.tip)}</div>
        </div>` : ''}
    </div>`;

  (d.itinerary || []).forEach(day => {
    const items = (day.items || []).map(item => {
      const badge = BADGE[item.type] || { css: 'badge-activity', label: '📍 Étape' };
      return `
        <div class="timeline-item">
          <div class="timeline-time">${esc(item.time || '')}</div>
          <div class="timeline-content glass-card">
            <span class="timeline-type-badge ${badge.css}">${badge.label}</span>
            <div class="timeline-title">${esc(item.title)}</div>
            <div class="timeline-desc">${esc(item.description || '')}</div>
            ${item.price ? `<div class="timeline-price">~ ${esc(item.price)}${item.duration ? ' · ' + esc(item.duration) : ''}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    html += `
      <div class="day-block">
        <div class="day-header">
          <div class="day-number">J${esc(day.day)}</div>
          <div>
            <div class="day-title">${esc(day.title)}</div>
            <div class="day-subtitle">${esc(day.subtitle || '')}</div>
          </div>
        </div>
        <div class="timeline">${items}</div>
      </div>`;
  });

  html += `<div id="tripMap" style="height: 350px; border-radius: var(--radius); margin-top: 32px; z-index: 1;"></div>`;

  document.getElementById('itineraryContent').innerHTML = html;

  setTimeout(() => initMap(d.destination), 200);
}

/* ---- MAP INIT ---- */
async function initMap(destination) {
  const mapEl = document.getElementById('tripMap');
  if (!mapEl) return;
  if (window.currentMap) { window.currentMap.remove(); }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`);
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      window.currentMap = L.map('tripMap').setView([lat, lon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(window.currentMap);
      L.marker([lat, lon]).addTo(window.currentMap).bindPopup(`<b>${esc(destination)}</b>`).openPopup();
    } else {
      mapEl.style.display = 'none';
    }
  } catch (err) {
    console.error("Map error:", err);
  }
}

/* ---- FLIGHTS ---- */
function renderFlights(d) {
  const allFlights = d.flights || [];
  if (!allFlights.length) {
    document.getElementById('flightsContent').innerHTML =
      '<p style="color:var(--muted);padding:20px 0;">Aucun vol disponible pour ces dates.</p>';
    return;
  }

  const outbound = allFlights.filter(f => f.type !== 'return');
  const ret      = allFlights.filter(f => f.type === 'return');

  const flightCard = f => {
    const skyscannerUrl = (f.from === 'XXX' || f.to === 'XXX')
      ? 'https://www.skyscanner.fr/'
      : `https://www.skyscanner.fr/transport/vols/${esc(f.from)}/${esc(f.to)}/`;
    return `
    <div class="flight-card glass-card">
      <div>
        <div class="flight-airport">${esc(f.from)}</div>
        <div class="flight-city">${esc(f.from_city)}</div>
        <div class="flight-time">${esc(f.departure_time)}</div>
      </div>
      <div class="flight-route">
        <div class="route-duration">${esc(f.duration)}</div>
        <div class="route-line"></div>
        <div class="route-stops">${esc(f.stops)}</div>
      </div>
      <div>
        <div class="flight-airport">${esc(f.to)}</div>
        <div class="flight-city">${esc(f.to_city)}</div>
        <div class="flight-time">${esc(f.arrival_time)}</div>
      </div>
      <div class="flight-price-col">
        <div class="flight-airline">${esc(f.airline)}</div>
        <div class="flight-price">${esc(f.price_per_person)}</div>
        <div style="font-size:11px;color:var(--muted)">par personne</div>
        <a href="${skyscannerUrl}" target="_blank" style="text-decoration:none;"><button class="btn-book">Sur Skyscanner</button></a>
      </div>
    </div>`;
  };

  const section = (flights, label) => `
    <h4 style="font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:12px;">${esc(label)}</h4>
    ${flights.map(flightCard).join('')}`;

  document.getElementById('flightsContent').innerHTML =
    section(outbound.length ? outbound : allFlights, 'Vol Aller') +
    (ret.length ? section(ret, 'Vol Retour') : '');
}

/* ---- HOTELS ---- */
function renderHotels(d) {
  const hotels = d.hotels || [];
  if (!hotels.length) {
    document.getElementById('hotelsContent').innerHTML =
      '<p style="color:var(--muted);padding:20px 0;">Aucun hébergement disponible.</p>';
    return;
  }

  document.getElementById('hotelsContent').innerHTML = hotels.map(h => `
    <div class="hotel-card glass-card">
      <div class="hotel-img">
        <div class="hotel-img-placeholder" style="font-size:64px;">${esc(h.emoji || '🏨')}</div>
      </div>
      <div class="hotel-body">
        <div class="hotel-name">${esc(h.name)}</div>
        <div class="hotel-location">📍 ${esc(h.location)}</div>
        <div class="hotel-stars">${'★'.repeat(Math.min(h.stars || 3, 5))}${'☆'.repeat(5 - Math.min(h.stars || 3, 5))}</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.5">${esc(h.highlights || '')}</div>
      </div>
      <div class="hotel-footer">
        <div>
          <div class="hotel-price-night">par nuit</div>
          <div class="hotel-price-val">${esc(h.price_per_night)}</div>
        </div>
        <a href="https://www.booking.com/searchresults.html?ss=${encodeURIComponent(h.name + ' ' + d.destination)}" target="_blank" style="text-decoration:none;"><button class="btn-book">Sur Booking</button></a>
      </div>
    </div>`).join('');
}

/* ---- ACTIVITIES ---- */
function renderActivities(d) {
  const activities = d.activities || [];
  if (!activities.length) {
    document.getElementById('activitiesContent').innerHTML =
      '<p style="color:var(--muted);padding:20px 0;">Aucune activité planifiée.</p>';
    return;
  }

  document.getElementById('activitiesContent').innerHTML = activities.map(a => `
    <div class="activity-row">
      <div class="activity-icon">${esc(a.emoji || '📍')}</div>
      <div class="activity-info">
        <div class="activity-name">${esc(a.name)}</div>
        <div class="activity-desc">${esc(a.description || '')}</div>
        <div class="activity-meta">
          <span>⏱ ${esc(a.duration)}</span>
          <span>🕐 ${esc(a.best_time)}</span>
          <span style="background:var(--parchment);padding:2px 10px;border-radius:100px;">${esc(a.category)}</span>
        </div>
      </div>
      <div class="activity-price-col">
        <div class="activity-price">${esc(a.price)}</div>
        <button class="btn-book" style="font-size:12px;padding:6px 14px;margin-top:6px;"
          onclick="window.showToast('Activité ajoutée !')">+ Ajouter</button>
      </div>
    </div>`).join('');
}

/* ---- EVENTS ---- */
function renderEvents(d) {
  const events = d.events || [];
  if (!events.length) {
    document.getElementById('eventsContent').innerHTML =
      '<p style="color:var(--muted);padding:20px 0;">Aucun événement trouvé pour ces dates.</p>';
    return;
  }

  document.getElementById('eventsContent').innerHTML = events.map(e => `
    <div class="event-card">
      <div class="event-date">📅 ${esc(e.date)}</div>
      <div class="event-name">${esc(e.name)}</div>
      <div class="event-venue">📍 ${esc(e.venue)}</div>
      ${e.description ? `<div style="font-size:13px;color:var(--muted);margin-top:8px;line-height:1.5">${esc(e.description)}</div>` : ''}
      <span class="event-cat">${esc(e.category)}</span>
    </div>`).join('');
}

/* ---- BUDGET ---- */
function renderBudget(d, params) {
  const bd = d.budget_breakdown || {};
  const cats = [
    { label: 'Vols',         key: 'vols',        color: '#3A6B8A' },
    { label: 'Hébergement',  key: 'hebergement', color: '#C9A84C' },
    { label: 'Activités',    key: 'activites',   color: '#5A7A5E' },
    { label: 'Restauration', key: 'restauration',color: '#C0634A' },
    { label: 'Transports',   key: 'transports',  color: '#7A5BAA' },
    { label: 'Divers',       key: 'divers',      color: '#888'    }
  ];

  const parseAmt = v => parseInt((v || '0').replace(/[^0-9]/g, '')) || 0;
  const total = parseAmt(bd.total) || cats.reduce((s, c) => s + parseAmt(bd[c.key]), 0);

  const rows = cats.map(c => {
    const pct = total > 0 ? Math.round(parseAmt(bd[c.key]) / total * 100) : 0;
    return `
      <div class="budget-row">
        <div class="budget-cat">${esc(c.label)}</div>
        <div class="budget-bar-wrap">
          <div class="budget-bar" style="width:${pct}%;background:${c.color};"></div>
        </div>
        <div class="budget-amount">${esc(bd[c.key] || '—')}</div>
      </div>`;
  }).join('');

  document.getElementById('budgetContent').innerHTML = `
    <div class="budget-title">Répartition estimée pour ${esc(params.travelers)}</div>
    ${rows}
    <div class="budget-row budget-total-row">
      <div class="budget-cat" style="font-weight:500;color:var(--ink)">Total</div>
      <div class="budget-bar-wrap"></div>
      <div class="budget-amount" style="font-weight:500;font-size:16px;">${esc(bd.total || total + ' €')}</div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:16px;">* Estimation basée sur vos paramètres. Les prix réels peuvent varier.</p>
  `;
}

/* ---- TIPS ---- */
function renderTips(d) {
  let html = `
    <div class="prose-section" style="margin-bottom:24px;">
      <h3>Conseils de TripGenie pour ${esc(d.destination)}</h3>
      <p>Nos recommandations pour profiter au maximum de votre voyage.</p>
    </div>
    <div class="tips-grid">
      ${(d.tips || []).map(t => `
        <div class="tip-card">
          <strong>${esc(t.title)}</strong>${esc(t.content)}
        </div>`).join('')}
    </div>`;

  if (d.local_phrases?.length) {
    html += `
      <div style="margin-top:32px;">
        <h4 style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:16px;">Mots essentiels</h4>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          ${d.local_phrases.map(p => `
            <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 20px;">
              <div style="font-size:12px;color:var(--muted)">${esc(p.phrase)}</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">${esc(p.translation)}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  document.getElementById('tipsContent').innerHTML = html;
}