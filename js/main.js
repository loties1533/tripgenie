// =============================================
// TRIPGENIE — js/main.js
// =============================================

import { 
  generatePack, getDestinations, login, signup, logout, getCurrentUser, 
  getPublicTrip, chatModify, chatOnboarding 
} from './api.js';
import { renderResults } from './render.js';
import {
  showToast, switchTab, setTripType, togglePref,
  getSelectedPrefs, printItinerary, scrollToSearch,
  initDates, startLoadingDots, stopLoadingDots,
  initTheme, toggleTheme, renderMoodBoard, toggleMood, getSelectedMoods
} from './ui.js';

const tripType = { value: 'roundtrip' };

document.addEventListener('DOMContentLoaded', () => {
  initDates();

  window.showToast         = showToast;
  window.switchTab         = switchTab;
  window.setTripType       = (t, btn) => setTripType(t, btn, tripType);
  window.togglePref        = togglePref;
  window.printItinerary    = printItinerary;
  window.scrollToSearch    = scrollToSearch;
  window.generateItinerary = generateItinerary;
  window.chatSend          = chatSend;
  window.handleChip        = handleChip;
  window.analyzeNLP        = () => {};
  window.openAuthModal     = openAuthModal;
  window.closeAuthModal    = closeAuthModal;
  window.handleLogin       = handleLogin;
  window.handleSignup      = handleSignup;
  window.shareTrip         = shareTrip;
  window.toggleTheme       = toggleTheme;
  window.toggleMood        = toggleMood;
  window.confirmMood       = confirmMood;

  initTheme();
  checkAuthBlock();
  checkDeepLink();
  loadLastTrip();

  document.getElementById('btnGenerate').addEventListener('click', generateItinerary);

  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') chatSend();
    });
  }

  setTimeout(() => {
    addMessage("Salut ! Je suis ton assistant TripGenie. ✨ Pour commencer, avec qui pars-tu ou quel type de voyage as-tu en tête ?", 'bot', ['Solo', 'En couple ❤️', 'Amis 🍻', 'Famille 👨‍👩‍👧']);
  }, 500);


// Compteur animé hero  ← AJOUTE ICI
  document.querySelectorAll('.hero-stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    const step = target / (2000 / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      el.textContent = Math.floor(current).toLocaleString();
    }, 16);
  });
});

// =============================================
// GÉNÉRATION MANUELLE (formulaire)
// =============================================

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

  const travelersNum = parseInt(travelers) || 2;
  const budgetNum = budget.includes('8 000') ? 10000
    : budget.includes('4 000') ? 6000
    : budget.includes('2 000') ? 3000
    : budget.includes('1 000') ? 1500
    : 800;

  setLoadingState(true);
  const dotTimer = startLoadingDots();

  try {
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
    const data = result.pack || result;
    window.currentTripId = result.trip_id;
    window.currentPackData = data;
    window.currentRenderParams = { origin, dest, departure, returnDate, travelers, budget, days };
    
    saveLastTrip(data, window.currentRenderParams);
    renderResults(data, window.currentRenderParams);

  } catch (err) {
    stopLoadingDots(dotTimer);
    console.error(err);
    showToast('Erreur lors de la génération. Réessayez.');
  }

  setLoadingState(false);
}

function detectMode(prefs) {
  const p = prefs.map(x => x.toLowerCase());
  if (p.some(x => x.includes('nuit') || x.includes('fête') || x.includes('musique'))) return 'party';
  if (p.some(x => x.includes('spa') || x.includes('bien') || x.includes('calme')))    return 'relax';
  if (p.some(x => x.includes('luxe') || x.includes('vip')))                           return 'luxury';
  if (p.some(x => x.includes('famille')))                                              return 'group';
  return 'party';
}

function setLoadingState(loading) {
  const btn     = document.getElementById('btnGenerate');
  const btnText = document.getElementById('btnText');
  const spinner = document.getElementById('btnSpinner');
  const loader  = document.getElementById('loadingState');
  const skeleton = document.getElementById('resultsSkeleton');
  const results = document.getElementById('resultsSection');

  if (loading) {
    btn.classList.add('loading');
    btnText.style.display = 'none';
    spinner.style.display = 'inline-block';
    loader.classList.add('active');
    skeleton.classList.add('active'); // On montre le skeleton
    results.classList.remove('active');
    scrollToSearch();

    // Rotation des messages de statut pour un effet "Premium"
    const steps = [
      { t: "Analyse du profil...", s: "Nous déchiffrons vos envies de voyage" },
      { t: "Recherche Web en cours...", s: "Nous piochons les meilleures pépites sur internet" },
      { t: "Comparaison des prix...", s: "Optimisation de votre budget vol et hôtel" },
      { t: "Création de l'itinéraire...", s: "Nos experts digitaux rédigent vos journées" }
    ];
    let i = 0;
    window._loaderInterval = setInterval(() => {
      i = (i + 1) % steps.length;
      statusText.style.opacity = 0;
      setTimeout(() => {
        statusText.textContent = steps[i].t;
        statusSub.textContent = steps[i].s;
        statusText.style.opacity = 1;
      }, 300);
    }, 2500);

  } else {
    loader.classList.remove('active');
    if (window._loaderInterval) clearInterval(window._loaderInterval);
  }
}

// =============================================
// CHAT CONVERSATIONNEL IA
// =============================================

const chatState = {
  data: { 
    travelers: null, 
    profile: null, 
    mode: 'relax', 
    interests: [],
    budget: null, 
    origin: null, 
    destination: null, 
    duration: null,
    discoveryMode: null,
    moods: []
  }
};

function addMessage(text, type = 'bot', chips = []) {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;

  const div = document.createElement('div');
  div.className = `chat-msg ${type}`;
  div.innerHTML = `<div class="chat-bubble">${text}</div>`;

  if (chips.length) {
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'chat-chips';
    chips.forEach(chip => {
      const btn = document.createElement('button');
      btn.className = 'chat-chip';
      btn.textContent = chip;
      btn.onclick = () => handleChip(chip);
      chipsDiv.appendChild(btn);
    });
    div.appendChild(chipsDiv);
  }

  messages.appendChild(div);
  
  // Petit délai pour scroller après l'animation CSS
  setTimeout(() => {
    messages.scrollTop = messages.scrollHeight;
  }, 100);
}

function showTyping() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = `<div class="chat-bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

function handleChip(value) {
  addMessage(value, 'user');

  // Mode sélection destination
  if (window._suggestedDestinations) {
    const dest = window._suggestedDestinations.find(d => value.includes(d.city));
    if (dest) {
      window._suggestedDestinations = null;
      addMessage(`Excellent choix ! 🚀 Je génère ton pack pour ${dest.city}...`, 'bot');
      launchGeneration(dest.city);
      return;
    }
  }

  processAnswer(value);
}

function quickGenerate(destination, mode) {
  document.getElementById('fieldDest').value = destination;
  chatState.data.mode = mode;
  chatState.data.destination = destination;
  scrollToSearch();
  setTimeout(() => generateItinerary(), 300);
}
window.quickGenerate = quickGenerate;

function chatSend() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  addMessage(value, 'user');

  // SI UN VOYAGE EST DÉJÀ AFFICHÉ -> MODE RAFFINEMENT
  if (window.currentPackData) {
    handleRefinement(value);
    return;
  }

  // SINON -> MODE QUESTIONNAIRE / SUGGESTION
  if (window._suggestedDestinations) {
    const dest = window._suggestedDestinations.find(d => value.toLowerCase().includes(d.city.toLowerCase()));
    if (dest) {
      window._suggestedDestinations = null;
      addMessage(`Excellent choix ! 🚀 Je génère ton pack pour ${dest.city}...`, 'bot');
      launchGeneration(dest.city);
      return;
    }
  }

  processAnswer(value);
}

async function processAnswer(value) {
  try {
    showTyping();
    const res = await chatOnboarding(value, chatState.data);
    removeTyping();

    // Mise à jour des données extraites par l'IA
    if (res.extractedData) {
      Object.assign(chatState.data, res.extractedData);
      console.log("Données extraites :", chatState.data);
    }

    if (res.isReady) {
      addMessage("Super, j'ai tout ce qu'il me faut ! 🎯 Je cherche les meilleures pépites pour vous...", 'bot');
      suggestAndGenerate();
    } else {
      addMessage(res.response, 'bot', res.chips || []);
      
      // TRIGGER MOOD BOARD: Si c'est le début et qu'on n'a pas encore de mood
      if (!chatState.data.moods || chatState.data.moods.length === 0) {
        setTimeout(() => renderMoodBoard(), 1000);
      }
    }

  } catch (err) {
    removeTyping();
    console.error(err);
    addMessage("Oups, j'ai un petit souci technique. On peut continuer ?", 'bot');
  }
}

async function suggestAndGenerate() {
  showTyping();
  try {
    const res = await getDestinations({
      mode:        chatState.data.mode,
      profile:     chatState.data.profile,
      interests:   chatState.data.interests,
      budget:      chatState.data.budget,
      travelers:   chatState.data.travelers,
      duration:    chatState.data.duration,
      origin:      chatState.data.origin,
      moods:       chatState.data.moods,
      discoveryMode: chatState.data.discoveryMode,
      preferences: []
    });

    removeTyping();
    const profileStr = chatState.data.profile || 'Voyageur';
    addMessage(`Compte tenu de votre profil (${profileStr}) et de vos intérêts, voici mes 3 meilleures pépites 🌍`, 'bot');
    
    const cities = res.destinations || [];
    if (!cities.length) {
      addMessage("Désolé, je n'ai pas trouvé de destinations insolites correspondant exactement à tes critères. On réessaie ?", 'bot', ['On recommence']);
      return;
    }

    const chips = cities.map(d => d.city);
    addMessage('Laquelle de ces pépites te tente le plus ?', 'bot', chips);

    window._suggestedDestinations = cities;

  } catch (err) {
    removeTyping();
    console.error('Destinations suggest error:', err);
    addMessage("Je n'arrive pas à joindre mes experts pour le moment, mais ne t'inquiète pas, on peut quand même continuer !", 'bot', ['On recommence']);
  }
}

function launchGeneration(destination) {
  const d = chatState.data;

  const departure = new Date();
  departure.setDate(departure.getDate() + 14);
  const returnDate = new Date(departure);
  returnDate.setDate(returnDate.getDate() + d.duration);

  const fmt = date => date.toISOString().split('T')[0];

  document.getElementById('fieldDest').value   = destination;
  document.getElementById('fieldOrigin').value = d.origin;

  setLoadingState(true);
  const dotTimer = startLoadingDots();

  generatePack({
    destination,
    origin:      d.origin,
    departure:   fmt(departure),
    return_date: fmt(returnDate),
    travelers:   d.travelers,
    budget:      d.budget,
    mode:        d.mode,
    preferences: []
  }).then(result => {
    stopLoadingDots(dotTimer);
    const data = result.pack || result;
    window.currentTripId = result.trip_id;
    window.currentPackData = data;
    window.currentRenderParams = {
      origin: d.origin, dest: destination,
      departure: fmt(departure), returnDate: fmt(returnDate),
      travelers: d.travelers, budget: d.budget + '€',
      days: d.duration
    };
    renderResults(data, window.currentRenderParams);
    setLoadingState(false);
  }).catch(err => {
    stopLoadingDots(dotTimer);
    showToast('Erreur génération, réessaie');
    setLoadingState(false);
  });
}

// =============================================
// AUTH MODAL & LOGIC
// =============================================

function checkAuthBlock() {
  const user = getCurrentUser();
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    if (user) {
      authBtn.textContent = user.name || user.email;
      authBtn.onclick = handleLogout;
    } else {
      authBtn.textContent = 'Se connecter';
      authBtn.onclick = () => openAuthModal('login');
    }
  }
}

function openAuthModal(tab) {
  document.getElementById('authModal').style.display = 'flex';
  switchAuthTab(tab);
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
}

function switchAuthTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabSignup').classList.toggle('active', tab === 'signup');
  const lf = document.getElementById('loginForm');
  const sf = document.getElementById('signupForm');
  if (lf) {
    lf.classList.toggle('active', tab === 'login');
    lf.style.display = tab === 'login' ? 'flex' : 'none';
  }
  if (sf) {
    sf.classList.toggle('active', tab === 'signup');
    sf.style.display = tab === 'signup' ? 'flex' : 'none';
  }
}

async function confirmMood() {
  const chosen = getSelectedMoods();
  if (chosen.length === 0) {
    showToast("Choisis au moins une image pour m'aider ! 😊");
    return;
  }
  
  chatState.data.moods = chosen;
  document.getElementById('moodBoard').classList.remove('active');
  
  addMessage(`Pépites sélectionnées : ${chosen.join(', ')} ! Je vais adapter l'itinéraire à cette ambiance. ✨`, 'user');
  
  // On informe l'IA du choix de l'ambiance
  processAnswer(`J'ai choisi ces ambiances : ${chosen.join(', ')}. Adapte tes prochaines suggestions.`);
}
window.confirmMood = confirmMood;

async function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;
  if (!email || !pass) return showToast('Remplissez tous les champs');
  try {
    await login(email, pass);
    closeAuthModal();
    showToast('Bienvenue !');
    checkAuthBlock();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleSignup() {
  const email = document.getElementById('signupEmail').value;
  const pass = document.getElementById('signupPass').value;
  const name = document.getElementById('signupName').value;
  if (!email || !pass) return showToast('Remplissez tous les champs');
  try {
    await signup(email, pass, name);
    closeAuthModal();
    showToast('Compte créé avec succès !');
    checkAuthBlock();
  } catch (err) {
    showToast(err.message);
  }
}

function handleLogout() {
  logout();
  showToast('Déconnexion réussie');
  checkAuthBlock();
}

// ---- DEEP LINK (Partage) ----
async function checkDeepLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const tripId = urlParams.get('tripId');
  if (tripId) {
    try {
      showToast('Chargement du voyage partagé...');
      const { trip } = await getPublicTrip(tripId);
      if (trip && trip.pack_data) {
        // Mock des params manquants pour le rendu
        const params = {
          departure: trip.departure,
          returnDate: trip.return_date,
          days: (trip.pack_data.summary?.nights || 6) + 1,
          travelers: trip.travelers,
          budget: trip.budget
        };
        renderResults(trip.pack_data, params);
      }
    } catch (err) {
      console.error('DeepLink error:', err);
      showToast('Impossible de charger ce voyage.');
    }
  }
}

// ---- SHARE TRIP ----
async function shareTrip() {
  const urlParams = new URLSearchParams(window.location.search);
  let tripId = urlParams.get('tripId');
  
  if (!tripId && window.currentTripId) {
    tripId = window.currentTripId;
  }

  if (tripId) {
    const shareUrl = `${window.location.origin}${window.location.pathname}?tripId=${tripId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Lien de partage copié dans le presse-papier !');
    } catch (err) {
      showToast(`Lien : ${shareUrl}`);
    }
  } else {
    showToast('Sauvegardez d\'abord votre voyage pour le partager.');
  }
}

async function handleRefinement(message) {
  try {
    showTyping();
    const res = await chatModify(message, window.currentPackData, chatState.data.mode, window.currentTripId);
    removeTyping();

    if (res.response) {
      addMessage(res.response, 'bot');
    }

    if (res.needs_full_regen) {
      addMessage("D'accord, je vais générer une nouvelle proposition complète...", 'bot');
      generateItinerary();
      return;
    }

    if (res.modifications) {
      // Fusionner les modifications dans le pack actuel
      Object.keys(res.modifications).forEach(key => {
        if (res.modifications[key]) {
          window.currentPackData[key] = res.modifications[key];
        }
      });
      
      showToast('Itinéraire mis à jour ! 🚀');
      renderResults(window.currentPackData, window.currentRenderParams);
    }

  } catch (err) {
    removeTyping();
    console.error(err);
    addMessage("Pardon, j'ai eu un problème pour modifier ton voyage. On réessaie ?", 'bot');
  }
}

// ---- PERSISTANCE LOCALE ----
function saveLastTrip(data, params) {
  localStorage.setItem('lastTrip', JSON.stringify({ data, params }));
}

function loadLastTrip() {
  try {
    const saved = localStorage.getItem('lastTrip');
    if (saved && !new URLSearchParams(window.location.search).get('tripId')) {
      const { data, params } = JSON.parse(saved);
      window.currentPackData = data;
      window.currentRenderParams = params;
      renderResults(data, params);
    }
  } catch (e) {
    console.warn("Could not load last trip:", e);
  }
}