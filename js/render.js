/* ============================================
   TRIPGENIE — Render Results
   js/render.js
   ============================================ */

import { showToast, formatDate } from './ui.js';

/**
 * Point d'entrée principal — rend tous les onglets
 */
export function renderResults(d, params) {
  renderHeader(d, params);
  renderSummary(d, params);
  renderItinerary(d);
  renderFlights(d);
  renderHotels(d);
  renderActivities(d);
  renderEvents(d);
  renderBudget(d, params);
  renderTips(d);

  document.getElementById('resultsSection').classList.add('active');
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

/* ---- HEADER ---- */
function renderHeader(d, params) {
  document.getElementById('resTitle').textContent = `Voyage à ${d.destination}, ${d.country}`;
  document.getElementById('resMeta').innerHTML = `
    <span class="meta-tag">📅 ${formatDate(params.departure)} → ${formatDate(params.returnDate)}</span>
    <span class="meta-tag">⏱ ${params.days} jours</span>
    <span class="meta-tag">👥 ${params.travelers}</span>
    <span class="meta-tag">💰 ${params.budget}</span>
  `;
}

/* ---- SUMMARY CARDS ---- */
function renderSummary(d, params) {
  document.getElementById('summaryGrid').innerHTML = `
    <div class="summary-card">
      <span class="summary-icon">✈</span>
      <div class="summary-label">Budget total estimé</div>
      <div class="summary-value">${d.summary?.total_budget || d.budget_breakdown?.total || '—'}</div>
    </div>
    <div class="summary-card">
      <span class="summary-icon">🌙</span>
      <div class="summary-label">Nuits d'hôtel</div>
      <div class="summary-value">${d.summary?.nights || params.days - 1}</div>
    </div>
    <div class="summary-card">
      <span class="summary-icon">🎭</span>
      <div class="summary-label">Activités planifiées</div>
      <div class="summary-value">${d.activities?.length || d.summary?.activities_count || 0}</div>
    </div>
    <div class="summary-card">
      <span class="summary-icon">🌡</span>
      <div class="summary-label">Météo prévue</div>
      <div class="summary-value">${d.weather?.avg_temp || '—'}</div>
    </div>
  `;
}

/* ---- ITINERARY ---- */
function renderItinerary(d) {
  let html = `
    <div class="prose-section">
      <h3>${d.tagline || 'Votre voyage de rêve'}</h3>
      <p>${d.overview || ''}</p>
      ${d.weather ? `
        <div class="weather-strip">
          <div class="weather-chip">🌡 ${d.weather.avg_temp}</div>
          <div class="weather-chip">☁ ${d.weather.conditions}</div>
          <div class="weather-chip">💡 ${d.weather.tip}</div>
        </div>` : ''}
    </div>`;

  (d.itinerary || []).forEach(day => {
    const items = (day.items || []).map(item => {
      const badgeClass = { flight: 'badge-flight', hotel: 'badge-hotel', activity: 'badge-activity', food: 'badge-food', event: 'badge-event' }[item.type] || 'badge-activity';
      const typeLabel = { flight: '✈ Vol', hotel: '🏨 Hôtel', activity: '🎭 Activité', food: '🍽 Restaurant', event: '🎉 Événement' }[item.type] || '📍 Étape';
      return `
        <div class="timeline-item">
          <div class="timeline-time">${item.time || ''}</div>
          <div class="timeline-content">
            <span class="timeline-type-badge ${badgeClass}">${typeLabel}</span>
            <div class="timeline-title">${item.title}</div>
            <div class="timeline-desc">${item.description || ''}</div>
            ${item.price ? `<div class="timeline-price">~ ${item.price}${item.duration ? ' · ' + item.duration : ''}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    html += `
      <div class="day-block">
        <div class="day-header">
          <div class="day-number">J${day.day}</div>
          <div>
            <div class="day-title">${day.title}</div>
            <div class="day-subtitle">${day.subtitle || ''}</div>
          </div>
        </div>
        <div class="timeline">${items}</div>
      </div>`;
  });

  document.getElementById('itineraryContent').innerHTML = html;
}

/* ---- FLIGHTS ---- */
function renderFlights(d) {
  const allFlights = d.flights || [];
  if (!allFlights.length) {
    document.getElementById('flightsContent').innerHTML = '<p style="color:var(--muted)">Aucun vol généré.</p>';
    return;
  }

  const outbound = allFlights.filter(f => f.type !== 'return');
  const ret      = allFlights.filter(f => f.type === 'return');

  const flightCards = (flights) => flights.map(f => `
    <div class="flight-card">
      <div>
        <div class="flight-airport">${f.from}</div>
        <div class="flight-city">${f.from_city}</div>
        <div class="flight-time">${f.departure_time}</div>
      </div>
      <div class="flight-route">
        <div class="route-duration">${f.duration}</div>
        <div class="route-line"></div>
        <div class="route-stops">${f.stops}</div>
      </div>
      <div>
        <div class="flight-airport">${f.to}</div>
        <div class="flight-city">${f.to_city}</div>
        <div class="flight-time">${f.arrival_time}</div>
      </div>
      <div class="flight-price-col">
        <div class="flight-airline">${f.airline}</div>
        <div class="flight-price">${f.price_per_person}</div>
        <div style="font-size:11px;color:var(--muted)">par personne</div>
        <button class="btn-book" onclick="window.showToast('Redirection vers la compagnie...')">Réserver</button>
      </div>
    </div>`).join('');

  const section = (flights, label) => `
    <h4 style="font-size:14px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin-bottom:12px;">${label}</h4>
    ${flightCards(flights)}`;

  document.getElementById('flightsContent').innerHTML =
    section(outbound.length ? outbound : allFlights, 'Vol Aller') +
    (ret.length ? section(ret, 'Vol Retour') : '');
}

/* ---- HOTELS ---- */
function renderHotels(d) {
  document.getElementById('hotelsContent').innerHTML = (d.hotels || []).map(h => `
    <div class="hotel-card">
      <div class="hotel-img">
        <div class="hotel-img-placeholder" style="font-size:64px;">${h.emoji || '🏨'}</div>
      </div>
      <div class="hotel-body">
        <div class="hotel-name">${h.name}</div>
        <div class="hotel-location">📍 ${h.location}</div>
        <div class="hotel-stars">${'★'.repeat(h.stars || 3)}${'☆'.repeat(5 - (h.stars || 3))}</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.5">${h.highlights || ''}</div>
      </div>
      <div class="hotel-footer">
        <div>
          <div class="hotel-price-night">par nuit</div>
          <div class="hotel-price-val">${h.price_per_night}</div>
        </div>
        <button class="btn-book" onclick="window.showToast('Redirection vers la réservation...')">Choisir</button>
      </div>
    </div>`).join('');
}

/* ---- ACTIVITIES ---- */
function renderActivities(d) {
  document.getElementById('activitiesContent').innerHTML = (d.activities || []).map(a => `
    <div class="activity-row">
      <div class="activity-icon">${a.emoji || '📍'}</div>
      <div class="activity-info">
        <div class="activity-name">${a.name}</div>
        <div class="activity-desc">${a.description || ''}</div>
        <div class="activity-meta">
          <span>⏱ ${a.duration}</span>
          <span>🕐 ${a.best_time}</span>
          <span style="background:var(--parchment);padding:2px 10px;border-radius:100px;">${a.category}</span>
        </div>
      </div>
      <div class="activity-price-col">
        <div class="activity-price">${a.price}</div>
        <button class="btn-book" style="font-size:12px;padding:6px 14px;margin-top:6px;" onclick="window.showToast('Activité ajoutée !')">+ Ajouter</button>
      </div>
    </div>`).join('');
}

/* ---- EVENTS ---- */
function renderEvents(d) {
  document.getElementById('eventsContent').innerHTML = (d.events || []).map(e => `
    <div class="event-card">
      <div class="event-date">📅 ${e.date}</div>
      <div class="event-name">${e.name}</div>
      <div class="event-venue">📍 ${e.venue}</div>
      ${e.description ? `<div style="font-size:13px;color:var(--muted);margin-top:8px;line-height:1.5">${e.description}</div>` : ''}
      <span class="event-cat">${e.category}</span>
    </div>`).join('');
}

/* ---- BUDGET ---- */
function renderBudget(d, params) {
  const bd = d.budget_breakdown || {};
  const cats = [
    { label: 'Vols',         key: 'vols',         color: '#3A6B8A' },
    { label: 'Hébergement',  key: 'hebergement',  color: '#C9A84C' },
    { label: 'Activités',    key: 'activites',     color: '#5A7A5E' },
    { label: 'Restauration', key: 'restauration',  color: '#C0634A' },
    { label: 'Transports',   key: 'transports',    color: '#7A5BAA' },
    { label: 'Divers',       key: 'divers',        color: '#888'    }
  ];

  const parseAmt = v => parseInt((v || '0').replace(/[^0-9]/g, '')) || 0;
  const total = parseAmt(bd.total) || cats.reduce((s, c) => s + parseAmt(bd[c.key]), 0);

  const rows = cats.map(c => {
    const pct = total > 0 ? (parseAmt(bd[c.key]) / total * 100) : 0;
    return `
      <div class="budget-row">
        <div class="budget-cat">${c.label}</div>
        <div class="budget-bar-wrap">
          <div class="budget-bar" style="width:${pct}%;background:${c.color};"></div>
        </div>
        <div class="budget-amount">${bd[c.key] || '—'}</div>
      </div>`;
  }).join('');

  document.getElementById('budgetContent').innerHTML = `
    <div class="budget-title">Répartition estimée pour ${params.travelers}</div>
    ${rows}
    <div class="budget-row budget-total-row">
      <div class="budget-cat" style="font-weight:500;color:var(--ink)">Total</div>
      <div class="budget-bar-wrap"></div>
      <div class="budget-amount" style="font-weight:500;font-size:16px;">${bd.total || total + ' €'}</div>
    </div>
    <p style="font-size:12px;color:var(--muted);margin-top:16px;">* Estimation basée sur vos paramètres. Les prix réels peuvent varier.</p>
  `;
}

/* ---- TIPS ---- */
function renderTips(d) {
  let html = `
    <div class="prose-section" style="margin-bottom:24px;">
      <h3>Conseils de TripGenie pour ${d.destination}</h3>
      <p>Nos recommandations pour profiter au maximum de votre voyage.</p>
    </div>
    <div class="tips-grid">
      ${(d.tips || []).map(t => `<div class="tip-card"><strong>${t.title}</strong>${t.content}</div>`).join('')}
    </div>`;

  if (d.local_phrases?.length) {
    html += `
      <div style="margin-top:32px;">
        <h4 style="font-family:'Playfair Display',serif;font-size:20px;margin-bottom:16px;">Mots essentiels en ${d.destination}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          ${d.local_phrases.map(p => `
            <div style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 20px;">
              <div style="font-size:12px;color:var(--muted)">${p.phrase}</div>
              <div style="font-size:16px;font-weight:500;margin-top:2px">${p.translation}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  document.getElementById('tipsContent').innerHTML = html;
}
