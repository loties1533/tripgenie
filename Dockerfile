# =============================================
# TripGenie — Dockerfile Backend (Express / Node.js)
# =============================================

FROM node:18-alpine

# Dossier de travail
WORKDIR /app

# Copie des dépendances en premier (optimise le cache Docker)
COPY package*.json ./

# Installation des dépendances
RUN npm install

# Copie du code source
COPY server/ ./server/
COPY tsconfig.json ./

# Build TypeScript → JavaScript
RUN npm run build 2>/dev/null || true

# Port exposé
EXPOSE 3000

# Démarrage
CMD ["npm", "start"]
