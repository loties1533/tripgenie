# TripGenie — Debrief Complet
*Dernière mise à jour : 12 avril 2026*

---

## 🎯 Résumé du projet

TripGenie est une plateforme de voyage intelligente qui transforme une idée simple ("4 amis, fête, 1000€") en un pack voyage complet : destination, vols, hôtels, activités et événements locaux — le tout généré par IA et optimisé par un algorithme de scoring.

**Différenciation vs Booking/Airbnb :** Au lieu de chercher séparément vols + hôtels, TripGenie assemble automatiquement un pack complet optimisé selon l'ambiance voulue. C'est un Travel AI Agent, pas un moteur de recherche.

---

## ✅ État actuel — Ce qui fonctionne

- Serveur Express complet (auth JWT, routes API, middleware)
- Chat conversationnel IA en 5 étapes (groupe → ambiance → budget → durée → départ)
- Destinations intelligentes par mode + budget (hardcodées en fallback)
- Génération de pack complet via IA (itinéraire, hôtels, activités, budget)
- PredictHQ connecté (vrais événements — 13 jours d'essai)
- Supabase connecté (base de données, sauvegarde des voyages)
- Authentification JWT (signup, login, profil)
- Rate limiting (global + spécifique IA)
- Helmet + CORS + bcrypt (sécurité de base)
- Scoring multi-critères par mode (party, relax, luxury, group, surprise)
- Fallback gracieux si APIs externes down
- NLP qui remplit le formulaire automatiquement
- Correction du calcul des nuits (vraies dates)
- Hero section avec stats animées
- Rotation automatique de modèles IA gratuits

---

## ❌ Ce qui ne fonctionne pas / Bugs à corriger

### Bugs critiques
| Bug | Fichier | Description |
|-----|---------|-------------|
| IA instable | `server/services/claude.js` | Tous les modèles gratuits OpenRouter sont rate-limités. Gemini quota = 0. Besoin d'une clé payante ou nouveau projet Google |
| Amadeus invalide | `.env` | `AMADEUS_CLIENT_ID` et `AMADEUS_CLIENT_SECRET` vides → vols simulés |
| Voyageurs chat reste à 2 | `js/main.js` | Le select fieldTravelers n'est pas mis à jour par le chat |
| Budget hardcodé fragile | `js/main.js` | `budget.includes('8 000')` → casse si l'UI change |

### Bugs mineurs
| Bug | Fichier | Description |
|-----|---------|-------------|
| README obsolète | `README.md` | Décrit l'ancienne archi sans serveur |
| js/api.js orphelin | `js/api.js` | Doublon de `client/js/api.js` — à supprimer |
| Destination "non spécifiée" | `js/render.js` | Affiche "non spécifiée" si destination null |
| Budget "Luxe" par défaut | `js/main.js` | Mauvaise sélection du budget dans le chat |
| Hôtels fictifs | `server/services/claude.js` | Noms générés par IA, pas de vraie API hôtels |

---

## 🔑 APIs — État des connexions

| API | Statut | Clé | Usage |
|-----|--------|-----|-------|
| Supabase | ✅ Connecté | Configurée | Base de données + auth |
| PredictHQ | ✅ Connecté | Configurée | Vrais événements (13j essai) |
| OpenRouter | ⚠️ Rate limited | Configurée | Modèles gratuits saturés |
| Gemini | ❌ Quota 0 | Configurée | Nouveau projet Google nécessaire |
| Amadeus | ❌ Invalid | Vide | Vols + hôtels simulés |
| Anthropic | ❌ No credits | Vide | Solde insuffisant |

---

## 🗂 Arborescence complète

```
tripgenie/
├── index.html                  ← Page principale (front)
├── .env                        ← Variables d'environnement (ne pas committer)
├── .env.example                ← Template du .env
├── .gitignore
├── package.json
│
├── css/
│   ├── variables.css           ← Variables CSS globales + reset
│   ├── header.css              ← Header, nav, hero section
│   ├── search.css              ← Formulaire + chat conversationnel
│   ├── results.css             ← Section résultats + tabs
│   ├── components.css          ← Vols, hôtels, activités, budget...
│   └── responsive.css          ← Media queries mobile
│
├── js/
│   ├── main.js                 ← Point d'entrée, chat IA, orchestration
│   ├── api.js                  ← ⚠️ ORPHELIN — doublon de client/js/api.js
│   ├── render.js               ← Rendu HTML des résultats
│   └── ui.js                   ← Utilitaires (toast, tabs, dates...)
│
├── client/
│   └── js/
│       └── api.js              ← Requêtes HTTP vers le back Express
│
├── server/
│   ├── index.js                ← Point d'entrée Express
│   │
│   ├── db/
│   │   ├── supabase.js         ← Client Supabase
│   │   └── schema.sql          ← Schéma DB (users, trips, packs, prefs)
│   │
│   ├── middleware/
│   │   └── auth.js             ← JWT requireAuth + optionalAuth
│   │
│   ├── routes/
│   │   ├── auth.js             ← POST /signup, /login, GET/PUT /me
│   │   ├── ai.js               ← POST /analyze, /destinations, /generate, /chat
│   │   ├── trips.js            ← CRUD /trips
│   │   └── packs.js            ← GET/POST /packs
│   │
│   └── services/
│       ├── claude.js           ← IA (Claude/Gemini/OpenRouter) + prompts
│       ├── amadeus.js          ← Vols (recherche + IATA)
│       ├── predicthq.js        ← Événements locaux
│       └── scoring.js          ← Algorithme de scoring multi-critères
│
└── scripts/
    └── setup-db.js             ← Script d'initialisation Supabase
```

---

## 🏗 Architecture technique

```
Browser (localhost:3001)
    ↓ fetch()
Express Server (localhost:3000)
    ├── /api/auth    → JWT auth (Supabase users)
    ├── /api/ai      → IA (Gemini/Claude/OpenRouter)
    │       ├── analyzeRequest()    → NLP → JSON structuré
    │       ├── suggestDestinations() → 3 destinations
    │       ├── assemblePack()      → Pack complet
    │       └── chatModify()        → Modification via chat
    ├── /api/trips   → CRUD voyages (Supabase)
    └── /api/packs   → Sélection de packs
         ↓
    Services externes
    ├── Gemini/Claude/OpenRouter  → Génération IA
    ├── Amadeus                   → Vols réels
    ├── PredictHQ                 → Événements
    └── Supabase                  → DB + auth
```

---

## 🚀 Roadmap prioritaire (2 mois)

### Semaine 1-2 — Débloquer les vraies données
- [ ] Nouveau projet Google AI Studio → Gemini gratuit stable
- [ ] Créer compte Amadeus → vrais vols + hôtels
- [ ] Flow Event-First : mot clé → PredictHQ → voyage

### Semaine 3-4 — UX et mobile
- [ ] Responsive mobile (CSS + PWA)
- [ ] Export PDF de l'itinéraire
- [ ] URL partageable par pack
- [ ] Corriger bugs voyageurs/budget dans le chat

### Semaine 5-6 — Features différenciantes
- [ ] Split groupe (4 amis depuis 4 villes)
- [ ] Mode "Locals Only" (événements locaux PredictHQ)
- [ ] Comparateur destinations (même budget, 2 villes)
- [ ] Alertes prix (vol -30% sur destination sauvegardée)

### Semaine 7 — Monétisation
- [ ] Liens d'affiliation Booking.com + GetYourGuide
- [ ] Freemium (3 générations gratuites, 9€/mois illimité)
- [ ] Stripe intégré

### Semaine 8 — Déploiement
- [ ] Deploy front → Vercel
- [ ] Deploy back → Railway
- [ ] Domaine custom
- [ ] Variables d'env production
- [ ] Préparer démo Holberton + RNCP5

---

## 📋 Checklist RNCP5 (jury juillet)

| Critère | Statut | Notes |
|---------|--------|-------|
| Architecture client/serveur | ✅ | Express + front vanilla JS |
| Base de données | ✅ | Supabase PostgreSQL |
| API REST | ✅ | 4 routes complètes |
| Authentification | ✅ | JWT + bcrypt |
| Responsive mobile | ⚠️ | À améliorer |
| Déployé en ligne | ❌ | Obligatoire pour le jury |
| Code documenté | ⚠️ | Commentaires présents, README à mettre à jour |
| Sécurité | ⚠️ | Helmet ✅, JWT localStorage à migrer |
| Tests | ❌ | Zéro test — à ajouter |

---

## 💡 Commandes utiles

```bash
# Lancer le projet
npm run dev                    # Serveur (terminal 1)
npx serve . -p 3001           # Front (terminal 2)

# Git
git add . && git commit -m "message"
git checkout test-alexis_js   # Branche principale
git checkout test_ajout_ia    # Branche améliorations chat

# Vérifier les clés API
cat .env | grep -v "^#" | grep "="

# Vérifier les logs serveur
# → regarder le terminal nodemon directement
```

---

## 🔐 Variables d'environnement nécessaires

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=<long_random_string>
JWT_EXPIRES_IN=7d

# Base de données
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# IA (une seule suffit, priorité : Claude > Gemini > OpenRouter)
ANTHROPIC_API_KEY=sk-ant-...      # Payant
GEMINI_API_KEY=AIza...            # Gratuit (nouveau projet Google)
OPENROUTER_API_KEY=sk-or-v1-...  # Gratuit mais rate-limité

# APIs voyage
AMADEUS_CLIENT_ID=...             # Gratuit sandbox
AMADEUS_CLIENT_SECRET=...         # Gratuit sandbox
PREDICTHQ_API_KEY=...             # 13j essai puis payant

# Front
CLIENT_URL=http://localhost:3001
```

---

*TripGenie