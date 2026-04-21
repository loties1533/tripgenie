# 🚀 TripGenie — Guide de déploiement

> **RNCP 5 DWWM · Compétence C8** : Documenter le déploiement d'une application dynamique web ou web mobile

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Variables d'environnement](#2-variables-denvironnement)
3. [Installation locale (développement)](#3-installation-locale-développement)
4. [Build de production](#4-build-de-production)
5. [Déploiement serveur (VPS / Ubuntu)](#5-déploiement-serveur-vps--ubuntu)
6. [Base de données Supabase](#6-base-de-données-supabase)
7. [Démarche CI/CD (GitHub Actions)](#7-démarche-cicd-github-actions)
8. [Vérification post-déploiement](#8-vérification-post-déploiement)
9. [Sécurité](#9-sécurité)

---

## 1. Prérequis

| Outil | Version minimale | Rôle |
|-------|-----------------|------|
| Node.js | ≥ 18.0.0 | Runtime serveur Express |
| npm | ≥ 9.0.0 | Gestionnaire de paquets |
| Git | ≥ 2.x | Versionnement |
| Compte Supabase | — | Base de données PostgreSQL + Auth RLS |
| Clé Anthropic (optionnel) | — | IA Claude pour génération de packs |

Vérifier les versions installées :
```bash
node --version   # v18.x ou supérieur
npm --version    # 9.x ou supérieur
git --version
```

---

## 2. Variables d'environnement

Copier le fichier exemple et renseigner toutes les valeurs :

```bash
cp .env.example .env
```

### Variables requises

```env
# ---- Serveur ----
PORT=3000
NODE_ENV=production
CLIENT_URL=https://votre-domaine.com

# ---- JWT (générer avec la commande ci-dessous) ----
JWT_SECRET=<généré>
JWT_EXPIRES_IN=7d

# ---- Supabase ----
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# ---- IA (au moins 1 requis) ----
ANTHROPIC_API_KEY=sk-ant-...
# ou
OPENROUTER_API_KEY=sk-or-...
# ou
GEMINI_API_KEY=AIza...

# ---- APIs externes (optionnelles) ----
AMADEUS_CLIENT_ID=...
AMADEUS_CLIENT_SECRET=...
PREDICTHQ_API_KEY=...
```

Générer un JWT_SECRET sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Variables frontend (client-react)

```bash
cp client-react/.env.example client-react/.env
```

```env
VITE_API_URL=https://api.votre-domaine.com
```

> ⚠️ Ne jamais committer `.env` sur Git. Le fichier `.gitignore` l'exclut déjà.

---

## 3. Installation locale (développement)

### Backend

```bash
# 1. Installer les dépendances serveur
npm install

# 2. Configurer la base de données (Supabase)
# Exécuter server/db/schema.sql dans Supabase > SQL Editor

# 3. Lancer le serveur en mode développement
npm run dev
# → Serveur disponible sur http://localhost:3000
```

### Frontend React

```bash
# Dans un second terminal
npm run client:dev
# → Ouvre http://localhost:5173 (Vite dev server)
# → Proxy /api → localhost:3000 via vite.config.js
```

Vérifier que les deux tournent :
```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "version": "1.0.0" }
```

---

## 4. Build de production

### Build du frontend React

```bash
npm run client:build
# → Génère client-react/dist/ (fichiers statiques optimisés)
```

Les fichiers produits dans `client-react/dist/` sont servis statiquement.

### Préparer le serveur pour servir le frontend

Ajouter ces lignes dans `server/index.js` pour la production :

```js
import { fileURLToPath } from 'url';
import path from 'path';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Servir les assets React en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client-react/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client-react/dist/index.html'));
    }
  });
}
```

---

## 5. Déploiement serveur (VPS / Ubuntu)

### 5.1 Préparer le serveur

```bash
# Connexion SSH au VPS
ssh user@votre-ip

# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PM2 (process manager)
sudo npm install -g pm2

# Vérifier
node --version && npm --version && pm2 --version
```

### 5.2 Déployer l'application

```bash
# Cloner le dépôt
git clone https://github.com/votre-compte/tripgenie.git
cd tripgenie

# Copier et remplir les variables d'environnement
cp .env.example .env
nano .env  # Remplir toutes les valeurs

# Installer les dépendances
npm install --production

# Builder le frontend
npm run client:build

# Lancer avec PM2 (redémarre automatiquement en cas de crash)
pm2 start server/index.js --name "tripgenie" --env production
pm2 save   # Sauvegarder pour redémarrage au boot
pm2 startup # Configurer le démarrage automatique
```

### 5.3 Configurer Nginx (reverse proxy)

```bash
sudo apt install -y nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/tripgenie
```

Contenu du fichier Nginx :
```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/tripgenie /etc/nginx/sites-enabled/
sudo nginx -t        # Tester la config
sudo systemctl reload nginx
```

### 5.4 HTTPS avec Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
# → HTTPS automatiquement configuré et renouvelé
```

---

## 6. Base de données Supabase

### 6.1 Créer le projet

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Choisir une région proche (ex: eu-west-1 Paris)
3. Copier `Project URL` et `anon key` dans `.env`

### 6.2 Initialiser le schéma

Dans **Supabase > SQL Editor**, exécuter le contenu de :
```
server/db/schema.sql
```

Ce script crée :
- Table `users` (UUID, email unique, password hashé bcrypt)
- Table `trips` (référence users, pack_data JSONB)
- Table `packs` (référence trips, score, flight/hotel/events data)
- Table `user_preferences`
- Index sur `trips.user_id`, `trips.mode`, `packs.trip_id`
- **Row Level Security (RLS)** : chaque utilisateur ne voit que ses propres données

Vérifier que le schéma est bien créé :
```bash
node scripts/setup-db.js
```

### 6.3 Sauvegardes

Supabase effectue des sauvegardes automatiques quotidiennes sur les plans payants.  
Pour un export manuel :
```bash
# Via l'interface Supabase > Database > Backups
# Ou via pg_dump si accès PostgreSQL direct configuré
pg_dump --dbname="postgresql://postgres:[password]@[host]:5432/postgres" \
        --file="backup_$(date +%Y%m%d).sql"
```

---

## 7. Démarche CI/CD (GitHub Actions)

Fichier `.github/workflows/deploy.yml` à créer :

```yaml
name: Deploy TripGenie

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: npm run client:build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to VPS via SSH
        uses: appleboy/ssh-action@v1
        with:
          host:     ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key:      ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/tripgenie
            git pull origin main
            npm ci --production
            npm run client:build
            pm2 restart tripgenie
```

Les secrets GitHub (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VITE_API_URL`) sont configurés dans  
**Settings > Secrets and variables > Actions** du dépôt GitHub.

---

## 8. Vérification post-déploiement

Après chaque déploiement, vérifier les points suivants :

```bash
# 1. Health check API
curl https://votre-domaine.com/api/health
# → {"status":"ok","version":"1.0.0","env":"production"}

# 2. Vérifier les logs PM2
pm2 logs tripgenie --lines 50

# 3. Tester l'authentification
curl -X POST https://votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# 4. Tester une route IA (avec une clé valide)
curl -X POST https://votre-domaine.com/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"input":"4 amis, Ibiza, budget 3000€"}'

# 5. Vérifier HTTPS
curl -I https://votre-domaine.com
# → HTTP/2 200, Strict-Transport-Security présent
```

---

## 9. Sécurité

### Mesures implémentées

| Mesure | Fichier | Description |
|--------|---------|-------------|
| Helmet.js | `server/index.js` | Headers HTTP sécurisés (CSP, HSTS, X-Frame-Options...) |
| Rate limiting | `server/index.js` | 100 req/15min global · 5 req/min sur routes IA |
| JWT | `server/middleware/auth.js` | Tokens signés, expiration 7j, vérification sur chaque requête protégée |
| Bcrypt (factor 12) | `server/routes/auth.js` | Hash irréversible des mots de passe |
| RLS Supabase | `server/db/schema.sql` | Isolation des données par utilisateur au niveau BDD |
| Validation inputs | `server/routes/auth.js` | Email regex, longueur password 8-128 chars |
| sanitizeInput | `server/services/claude.js` | Nettoyage des entrées IA (max 300 chars, échappement) |
| CORS restreint | `server/index.js` | Origines autorisées explicitement |
| `.env` exclu | `.gitignore` | Secrets non versionnés |

### Variables à ne jamais exposer

- `JWT_SECRET` → compromet tous les tokens
- `SUPABASE_SERVICE_KEY` → accès admin à la BDD, contourne le RLS
- `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` → coûts non maîtrisés

### Mise à jour des dépendances

```bash
# Vérifier les vulnérabilités
npm audit

# Corriger automatiquement les non-breaking
npm audit fix

# Lister les mises à jour disponibles
npx npm-check-updates
```

---

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur Express en mode développement (nodemon) |
| `npm run start` | Serveur Express en production |
| `npm run client:dev` | Frontend React Vite (hot reload) |
| `npm run client:build` | Build production du frontend |
| `npm run setup-db` | Vérification connexion Supabase |

---

*TripGenie · RNCP 5 DWWM · Documentation de déploiement*
