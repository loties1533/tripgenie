// =============================================
// TRIPGENIE — js/main.js
// =============================================

import { generatePack, getDestinations, login, signup, logout, getCurrentUser } from './api.js';
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
  const statusText = document.getElementById('statusText');
  const statusSub  = document.getElementById('statusSub');

  btn.disabled          = loading;
  btnText.style.display = loading ? 'none'        : 'inline';
  spinner.style.display = loading ? 'inline-block' : 'none';

  if (loading) {
    loader.classList.add('active');
    results.classList.remove('active');
    loader.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
  step: 0,
  data: { 
    travelers: 2, 
    profile: 'couple', 
    mode: 'relax', 
    interests: [],
    budget: 1500, 
    origin: 'Paris', 
    destination: null, 
    duration: 7 
  }
};

const STEPS = [
  { key: 'profile',   question: "Salut ! Avec qui partez-vous ? 👥",      chips: ['Solo', 'En couple ❤️', 'Entre amis 🍻', 'En famille 👨‍👩‍👧'] },
  { key: 'mode',      question: "Quelle ambiance recherchez-vous ? ✨",   chips: ['🎉 Fête', '🧘 Détente', '🏛 Culture', '🌴 Plage', '😮 Surprise'] },
  { key: 'interests', question: "Un centre d'intérêt particulier ? 🎨",   chips: ['Gastronomie', 'Nature', 'Histoire', 'Shopping', 'Vie nocturne'] },
  { key: 'budget',    question: "Budget total pour le voyage ? 💰",       chips: ['< 1000€', '1000-2500€', '2500-5000€', '5000€+'] },
  { key: 'duration',  question: "Combien de temps partez-vous ? 📅",      chips: ['Week-end (2j)', 'Semaine (7j)', '10 jours', '2 semaines'] },
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

  if (step.key === 'profile') {
    chatState.data.profile = v.includes('couple') ? 'couple' : v.includes('amis') ? 'friends' : v.includes('famille') ? 'family' : 'solo';
    chatState.data.travelers = chatState.data.profile === 'solo' ? 1 : chatState.data.profile === 'couple' ? 2 : 4;
  } else if (step.key === 'mode') {
    chatState.data.mode = v.includes('fête') || v.includes('fete') ? 'party'
      : v.includes('détente') || v.includes('detente') ? 'relax'
      : v.includes('culture') ? 'culture'
      : v.includes('surprise') ? 'surprise'
      : v.includes('plage') ? 'beach'
      : 'party';
  } else if (step.key === 'interests') {
    chatState.data.interests = [value];
  } else if (step.key === 'budget') {
    // Tranches : '< 1000€', '1000-2500€', '2500-5000€', '5000€+'
    chatState.data.budget = v.includes('5000') ? 6000
      : v.includes('2500') ? 3500
      : v.includes('1000') ? 1500
      : 800;
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
      addMessage(`Super ! 🎯 Je cherche les meilleures pépites pour votre profil (${chatState.data.profile}), mode ${chatState.data.mode}, budget total ${chatState.data.budget}€...`, 'bot');
      suggestAndGenerate();
    }
  }, 800);
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
      preferences: []
    });

    removeTyping();
    addMessage(`Compte tenu de votre profil (${chatState.data.profile}) et de vos intérêts, voici mes 3 meilleures pépites 🌍`, 'bot');
    
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
    console.error(err);
    addMessage("Oups, mon moteur de recherche a eu un petit hoquet. Peux-tu réessayer ?", 'bot', ['On recommence']);
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