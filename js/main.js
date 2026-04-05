/* ============================================
   TRIPGENIE — Main Entry Point
   js/main.js
   ============================================ */

import { generateTrip }    from './api.js';
import { renderResults }   from './render.js';
import {
  showToast, switchTab, setTripType, togglePref,
  getSelectedPrefs, printItinerary, scrollToSearch,
  initDates, startLoadingDots, stopLoadingDots
} from './ui.js';

// ---- ÉTAT GLOBAL ----
const tripType = { value: 'roundtrip' };

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  bindEvents();

  // Expose fonctions globales pour les onclick HTML
  window.showToast      = showToast;
  window.switchTab      = switchTab;
  window.setTripType    = (t, btn) => setTripType(t, btn, tripType);
  window.togglePref     = togglePref;
  window.printItinerary = printItinerary;
  window.scrollToSearch = scrollToSearch;
  window.generateItinerary = generateItinerary;
});

// ---- EVENTS ----
function bindEvents() {
  document.getElementById('btnGenerate').addEventListener('click', generateItinerary);
}

// ---- GENERATE ----
async function generateItinerary() {
  const dest   = document.getElementById('fieldDest').value.trim();
  const origin = document.getElementById('fieldOrigin').value.trim();

  if (!dest) { showToast('Veuillez entrer une destination'); return; }

  const departure  = document.getElementById('fieldDeparture').value;
  const returnDate = document.getElementById('fieldReturn').value;
  const travelers  = document.getElementById('fieldTravelers').value;
  const budget     = document.getElementById('fieldBudget').value;
  const prefs      = getSelectedPrefs();
  const days       = departure && returnDate
    ? Math.round((new Date(returnDate) - new Date(departure)) / 86400000)
    : 7;

  // UI — état chargement
  setLoadingState(true);
  const dotTimer = startLoadingDots();

  try {
    const data = await generateTrip({
      origin, dest, tripType: tripType.value,
      departure, returnDate, travelers, budget, prefs, days
    });

    stopLoadingDots(dotTimer);
    renderResults(data, { origin, dest, departure, returnDate, travelers, budget, days });

  } catch (err) {
    stopLoadingDots(dotTimer);
    console.error(err);
    showToast('Erreur lors de la génération. Réessayez.');
  }

  setLoadingState(false);
}

// ---- HELPERS UI ----
function setLoadingState(loading) {
  const btn     = document.getElementById('btnGenerate');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('btnSpinner');
  const loader  = document.getElementById('loadingState');
  const results = document.getElementById('resultsSection');

  btn.disabled          = loading;
  btnText.style.display = loading ? 'none' : 'inline';
  spinner.style.display = loading ? 'inline-block' : 'none';

  if (loading) {
    loader.classList.add('active');
    results.classList.remove('active');
    loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    loader.classList.remove('active');
  }
}
