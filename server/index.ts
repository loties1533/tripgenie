// =============================================
// TRIPGENIE — server/index.ts (Point d'entrée backend)
// =============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Middlewares persos
import { globalErrorHandler, AppError } from './lib/AppError.js';

// Routes
import authRoutes from './routes/auth.js';
import tripsRoutes from './routes/trips.js';
import packsRoutes from './routes/packs.js';
import aiRoutes from './routes/ai.js';
import votesRoutes from './routes/votes.js';
import photosRoutes from './routes/photos.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration ESM pour les chemins statiques
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Configuration CORS stricte pour la prod ----
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Autorise l'envoi des cookies httpOnly
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ---- Middlewares de base ----
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Logging en développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ---- Routes API ----
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/votes', votesRoutes);
app.use('/api/photos', photosRoutes);

// Healthcheck pour s'assurer que le backend tourne
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- Gestion Frontend (Mode Production) ----
if (process.env.NODE_ENV === 'production') {
  console.log('🌟 Serveur en mode PRODUCTION - Service des fichiers React statiques');
  
  // Sert les fichiers statiques construits par Vite
  app.use(express.static(path.join(__dirname, '../client-react/dist')));

  // Redirige toutes les requêtes non-API vers l'index.html de React
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(__dirname, '../client-react/dist/index.html'));
  });
}

// ---- Gestion des routes non trouvées (404 API) ----
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ---- Middleware Global d'erreurs ----
app.use(globalErrorHandler);

export default app;

// ---- Lancement du serveur (pas en mode test) ----
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur backend démarré sur http://localhost:${PORT}`);
    console.log(`🛠️  Environnement : ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Supabase Configuré : ${process.env.SUPABASE_URL ? 'OUI' : 'NON'}`);
    console.log(`🧠 AI Provider: ${process.env.AI_PROVIDER || 'NON DÉFINI'}`);
  });
}
