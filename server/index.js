// =============================================
// TRIPGENIE — server/index.js
// Point d'entrée du serveur Express
// =============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const DIST_PATH  = join(__dirname, '../client-react/dist');

// Routes
import authRoutes   from './routes/auth.js';
import tripRoutes   from './routes/trips.js';
import aiRoutes     from './routes/ai.js';
import packRoutes   from './routes/packs.js';
import voteRoutes   from './routes/votes.js';
import photoRoutes  from './routes/photos.js';
import { globalErrorHandler } from './lib/AppError.js';

const app  = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', 1);

// ---- Sécurité ----
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());

const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
  : ['http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, cb) => {
    // Même origine (production) ou origine autorisée
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('CORS bloqué'));
  },
  credentials: true
}));

// ---- Rate limiting ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { error: 'Trop de requêtes, réessaye dans 15 minutes.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,      // 1 min
  max: 5,                   // max 5 générations/min
  message: { error: 'Limite de génération atteinte, attends 1 minute.' }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// ---- Routes ----
app.use('/api/auth',   authRoutes);
app.use('/api/trips',  tripRoutes);
app.use('/api/ai',     aiLimiter, aiRoutes);
app.use('/api/packs',  packRoutes);
app.use('/api/votes',  voteRoutes);
app.use('/api/photos', photoRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV });
});

// ---- Frontend React (production uniquement) ----
if (process.env.NODE_ENV === 'production' && existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get('*', (req, res) => {
    res.sendFile(join(DIST_PATH, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route introuvable' });
  });
}

// ---- Erreurs globales ----
app.use(globalErrorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🌍 TripGenie server running on http://localhost:${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV}`);
    console.log(`   Client: ${process.env.CLIENT_URL}\n`);
  });
}

export default app;
