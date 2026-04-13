// =============================================
// TRIPGENIE — js/main.js
// =============================================

import { generatePack, login, signup, logout, getCurrentUser } from './api.js';
import { renderResults } from './render.js';
import {
  showToast, switchTab, setTripType, togglePref,
  getSelectedPrefs, printItinerary, scrollToSearch,
  initDates, startLoadingDots, stopLoadingDots
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
  window.switchAuthTab     = switchAuthTab;
  window.handleLogin       = handleLogin;
  window.handleSignup      = handleSignup;

  checkAuthBlock();

  document.getElementById('btnGenerate').addEventListener('click', generateItinerary);

  const input = document.getElementById('chatInput');
  if (input) {
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') chatSend();
    });
  }

  setTimeout(() => {
    addMessage(STEPS[0].question, 'bot', STEPS[0].chips);
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
    renderResults(data, { origin, dest, departure, returnDate, travelers, budget, days });

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
  const results = document.getElementById('resultsSection');

  btn.disabled          = loading;
  btnText.style.display = loading ? 'none'        : 'inline';
  spinner.style.display = loading ? 'inline-block' : 'none';

  if (loading) {
    loader.classList.add('active');
    results.classList.remove('active');
    loader.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    loader.classList.remove('active');
  }
}

// =============================================
// CHAT CONVERSATIONNEL IA
// =============================================

const chatState = {
  step: 0,
  data: { travelers: 2, mode: 'party', budget: 1500, origin: 'Paris', destination: null, duration: 7 }
};

const STEPS = [
  { key: 'travelers', question: "Salut ! Vous partez à combien ? 👥",    chips: ['Solo', '2 personnes', '3-4 amis', '5+ personnes'] },
  { key: 'mode',      question: "Quelle ambiance vous cherchez ? ✨",     chips: ['🎉 Fête', '🧘 Détente', '🏛 Culture', '🌴 Plage', '😮 Surprise'] },
  { key: 'budget',    question: "Budget total pour le groupe ? 💰",       chips: ['< 500€', '500-1000€', '1000-2000€', '2000-5000€', '5000€+'] },
  { key: 'duration',  question: "Combien de temps ? 📅",                  chips: ['Week-end (2j)', 'Semaine (7j)', '10 jours', '2 semaines'] },
  { key: 'origin',    question: "Vous partez d'où ? ✈️",                  chips: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Autre'] },
];

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
  messages.scrollTop = messages.scrollHeight;
}

function showTyping() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = `<div class="typing"><span></span><span></span><span></span></div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

function handleChip(value) {
  addMessage(value, 'user');

function quickGenerate(destination, mode) {
  document.getElementById('fieldDest').value = destination;
  chatState.data.mode = mode;
  chatState.data.destination = destination;
  scrollToSearch();
  setTimeout(() => generateItinerary(), 300);
}
window.quickGenerate = quickGenerate;

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

function chatSend() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  input.value = '';
  addMessage(value, 'user');

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

function processAnswer(value) {
  const step = STEPS[chatState.step];
  if (!step) return;
  const v = value.toLowerCase();

  if (step.key === 'travelers') {
    chatState.data.travelers = v.includes('solo') ? 1 : v.includes('5') ? 5 : v.includes('3') || v.includes('4') ? 4 : 2;
  } else if (step.key === 'mode') {
    chatState.data.mode = v.includes('fête') || v.includes('fete') ? 'party'
      : v.includes('détente') || v.includes('detente') ? 'relax'
      : v.includes('culture') ? 'culture'
      : v.includes('surprise') ? 'surprise'
      : v.includes('plage') ? 'beach'
: v.includes('luxe') || v.includes('vip') ? 'luxury'
      : 'party';
  } else if (step.key === 'budget') {
    chatState.data.budget = v.includes('5000') ? 8000
      : v.includes('2000') ? 4000
      : v.includes('1000') ? 2000
      : v.includes('500') ? 800
      : 1500;
  } else if (step.key === 'duration') {
    chatState.data.duration = v.includes('week') ? 2 : v.includes('10') ? 10 : v.includes('2 sem') ? 14 : 7;
  } else if (step.key === 'origin') {
    chatState.data.origin = value.includes('Autre') ? 'Paris' : value;
  }

  chatState.step++;

  showTyping();
  setTimeout(() => {
    removeTyping();
    if (chatState.step < STEPS.length) {
      addMessage(STEPS[chatState.step].question, 'bot', STEPS[chatState.step].chips);
    } else {
      addMessage(`Super ! 🎯 Je cherche les meilleures destinations pour ${chatState.data.travelers} personne(s), mode ${chatState.data.mode}, budget ${chatState.data.budget}€...`, 'bot');
      suggestAndGenerate();
    }
  }, 800);
}

async function suggestAndGenerate() {
  // Destinations suggérées par l'IA en local — pas d'appel API
  const suggestions = {
    party:   ['Barcelona', 'Ibiza', 'Amsterdam'],
    relax:   ['Lisbonne', 'Séville', 'Porto'],
    culture: ['Rome', 'Prague', 'Vienne'],
    surprise: ['Budapest', 'Tallinn', 'Bucarest'],
    luxury:  ['Monaco', 'Cannes', 'Mykonos']
  };

  const mode = chatState.data.mode;
  const cities = suggestions[mode] || suggestions.party;

  removeTyping();
  addMessage('Voici mes 3 meilleures suggestions 🌍', 'bot');

  const chips = cities.map(c => c);
  addMessage('Choisis ta destination :', 'bot', chips);

  window._suggestedDestinations = cities.map(city => ({ city, vibe: '' }));
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
    renderResults(data, {
      origin: d.origin, dest: destination,
      departure: fmt(departure), returnDate: fmt(returnDate),
      travelers: d.travelers, budget: d.budget + '€',
      days: d.duration
    });
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