# =============================================
# TripGenie — Dockerfile Frontend (React / Vite → Nginx)
# =============================================

# ---- Stage 1 : Build React ----
FROM node:18-alpine AS builder

WORKDIR /app

# Dépendances en premier (cache Docker)
COPY package*.json ./
RUN npm install

# Code source
COPY . .

# Build production (génère /app/dist)
RUN npm run build

# ---- Stage 2 : Serve avec Nginx ----
FROM nginx:alpine

# Copie les fichiers buildés dans Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Config Nginx pour React Router (SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
