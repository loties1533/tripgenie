# =============================================
# TripGenie — Dockerfile Backend (Express / Node.js)
# =============================================

FROM node:20-alpine

# Dossier de travail
WORKDIR /app

# Copie des dépendances en premier (optimise le cache Docker)
COPY package*.json ./

# Installation des dépendances (avec devDependencies pour TypeScript)
RUN npm install

# Copie du code source
COPY server/ ./server/
COPY tsconfig.json ./

# Compile TypeScript → dist-server/
RUN npx tsc

# Port exposé
EXPOSE 3000

# Démarrage depuis le dossier compilé
CMD ["node", "dist-server/index.js"]
