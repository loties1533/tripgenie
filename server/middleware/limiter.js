import rateLimit from 'express-rate-limit';

// Limiteur pour les générations lourdes (Claude + Tavily)
// 5 requêtes par heure pour éviter de vider le compte
export const aiGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // On laisse 10 par heure pour être sympa
  message: {
    error: "Trop de générations en peu de temps. Reposez-vous un peu (limite : 10/heure)."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiteur pour le chat et l'analyse
export const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 messages par 15 minutes
  message: {
    error: "Calme-toi sur le chat ! Réessaye dans 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
});
