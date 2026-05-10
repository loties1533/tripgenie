// =============================================
// TRIPGENIE — server/index.js
// Point d'entrée du serveur Express
// =============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';

// Routes
import authRoutes  from './routes/auth.js';
import tripRoutes  from './routes/trips.js';
import aiRoutes    from './routes/ai.js';
import packRoutes  from './routes/packs.js';
import voteRoutes  from './routes/votes.js';
import paymentRoutes from './routes/payment.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Sécurité ----
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3001',
    'http://127.0.0.1:5500',
    'http://localhost:5500'
  ],
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
app.use('/api/auth',  authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/ai',    aiLimiter, aiRoutes);
app.use('/api/packs', packRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/payments', paymentRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', env: process.env.NODE_ENV });
});

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

// ---- Erreurs globales ----
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🌍 TripGenie server running on http://localhost:${PORT}`);
    console.log(`   ENV: ${process.env.NODE_ENV}`);
    console.log(`   Client: ${process.env.CLIENT_URL}\n`);
  });
}

export default app;
