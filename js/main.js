// =============================================
// TRIPGENIE — js/main.js
// Point d'entrée — appelle le back Express
// =============================================

import { generatePack } from './api.js';
import { renderResults } from './render.js';
import {
  showToast, switchTab, setTripType, togglePref,
  getSelectedPrefs, printItinerary, scrollToSearch,
  initDates, startLoadingDots, stopLoadingDots
} from './ui.js';

const tripType = { value: 'roundtrip' };

document.addEventListener('DOMContentLoaded', () => {
  initDates();

  // Expose globalement pour les onclick HTML
  window.showToast       = showToast;
  window.switchTab       = switchTab;
  window.setTripType     = (t, btn) => setTripType(t, btn, tripType);
  window.togglePref      = togglePref;
  window.printItinerary  = printItinerary;
  window.scrollToSearch  = scrollToSearch;
  window.generateItinerary = generateItinerary;

  document.getElementById('btnGenerate').addEventListener('click', generateItinerary);
});

async function generateItinerary() {
  const dest       = document.getElementById('fieldDest').value.trim();
  const origin     = document.getElementById('fieldOrigin').value.trim();

  if (!dest) { showToast('Veuillez entrer une destination'); return; }

  const departure  = document.getElementById('fieldDeparture').value;
  const returnDate = document.getElementById('fieldReturn').value;
  const travelers  = document.getElementById('fieldTravelers').value;
  const budget     = document.getElementById('fieldBudget').value;
  const prefs      = getSelectedPrefs();
  const days       = departure && returnDate
    ? Math.round((new Date(returnDate) - new Date(departure)) / 86400000)
    : 7;

  // Extraire le nombre de voyageurs
  const travelersNum = parseInt(travelers) || 2;

  // Extraire le budget en nombre
  const budgetNum = budget.includes('8 000') ? 10000
    : budget.includes('4 000') ? 6000
    : budget.includes('2 000') ? 3000
    : budget.includes('1 000') ? 1500
    : 800;

  setLoadingState(true);
  const dotTimer = startLoadingDots();

  try {
    // Appel au BACK — plus d'appel direct à Claude ici
    const result = await generatePack({
      destination:  dest,
      origin:       origin || 'Paris',
      departure,
      return_date:  returnDate,
      travelers:    travelersNum,
      budget:       budgetNum,
      mode:         detectMode(prefs),
      preferences:  prefs
    });

    stopLoadingDots(dotTimer);

    // Le back retourne { pack, trip_id, flights_found, events_found }
    const data = result.pack || result;
    renderResults(data, { origin, dest, departure, returnDate, travelers, budget, days });

  } catch (err) {
    stopLoadingDots(dotTimer);
    console.error(err);
    showToast('Erreur lors de la génération. Réessayez.');
  }

  setLoadingState(false);
}

// Détecte le mode selon les préférences sélectionnées
function detectMode(prefs) {
  const p = prefs.map(x => x.toLowerCase());
  if (p.some(x => x.includes('nuit') || x.includes('fête') || x.includes('musique'))) return 'party';
  if (p.some(x => x.includes('spa') || x.includes('bien') || x.includes('calme')))    return 'relax';
  if (p.some(x => x.includes('luxe') || x.includes('vip')))                           return 'luxury';
  if (p.some(x => x.includes('famille')))                                              return 'group';
  return 'party'; // défaut
}

function setLoadingState(loading) {
  const btn     = document.getElementById('btnGenerate');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('btnSpinner');
  const loader  = document.getElementById('loadingState');
  const results = document.getElementById('resultsSection');

  btn.disabled          = loading;
  btnText.style.display = loading ? 'none'         : 'inline';
  spinner.style.display = loading ? 'inline-block' : 'none';

  if (loading) {
    loader.classList.add('active');
    results.classList.remove('active');
    loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    loader.classList.remove('active');
  }
}

async function analyzeNLP() {
  const input = document.getElementById('nlpInput').value.trim();
  if (!input) return;

  const btn = document.getElementById('nlpBtn');
  btn.textContent = '...';
  btn.disabled = true;

  try {
    const res = await fetch('http://localhost:3000/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    const data = await res.json();
    const a = data.analysis;

    if (a.origin)      document.getElementById('fieldOrigin').value = a.origin;
    if (a.destination) document.getElementById('fieldDest').value = a.destination;

    if (a.travelers) {
      const sel = document.getElementById('fieldTravelers');
      [...sel.options].forEach(o => {
        if (o.value.includes(a.travelers)) o.selected = true;
      });
    }

    if (a.budget_total) {
      const sel = document.getElementById('fieldBudget');
      const b = a.budget_total;
      [...sel.options].forEach(o => {
        const t = o.textContent;
        if (b <= 1000 && t.includes('800'))     o.selected = true;
        else if (b <= 2000 && t.includes('1 000')) o.selected = true;
        else if (b <= 4000 && t.includes('2 000')) o.selected = true;
        else if (b <= 8000 && t.includes('4 000')) o.selected = true;
        else if (b > 8000 && t.includes('8 000'))  o.selected = true;
      });
    }

    if (a.destination) {
      showToast(`✨ ${a.travelers} voyageurs · ${a.mode} · ${a.budget_total}€ — Génération en cours...`);
      btn.textContent = 'Analyser';
      btn.disabled = false;
      setTimeout(() => generateItinerary(), 500);
    } else {
      showToast('✨ Compris ! Ajoute une destination 🌍');
      btn.textContent = 'Analyser';
      btn.disabled = false;
    }

  } catch (err) {
    showToast('Erreur analyse, réessaie');
    btn.textContent = 'Analyser';
    btn.disabled = false;
  }
}

window.analyzeNLP = analyzeNLP;