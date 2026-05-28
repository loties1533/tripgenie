// =============================================
// TRIPGENIE — tests/api.test.ts
// Tests routes API : auth, trips, votes, AI (tout mocké)
// =============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../server/index.js';

// ============================================================
// SETUP — variables d'environnement de test
// ============================================================

process.env.JWT_SECRET = 'test-jwt-secret-for-vitest';

// Token JWT valide pré-généré pour les routes protégées
const TEST_USER = { id: 'aabbccdd-0000-0000-0000-aabbccddee00', email: 'pilot@tripgenie.test', name: 'Test Pilot' };
const TEST_TOKEN = jwt.sign(TEST_USER, process.env.JWT_SECRET, { expiresIn: '1d' });
const TEST_TRIP_ID = '550e8400-e29b-41d4-a716-446655440000';

// ============================================================
// MOCKS GLOBAUX
// ============================================================

vi.mock('express-rate-limit', () => ({
  default:   () => (_req: any, _res: any, next: any) => next(),
  rateLimit: () => (_req: any, _res: any, next: any) => next()
}));

vi.mock('../server/middleware/limiter.js', () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return { aiGenerateLimiter: passthrough, aiChatLimiter: passthrough };
});

vi.mock('bcryptjs', () => ({
  default: {
    genSalt:  vi.fn().mockResolvedValue('salt'),
    hash:     vi.fn().mockResolvedValue('$2b$hashed_password'),
    compare:  vi.fn().mockResolvedValue(true)
  }
}));

// ---- Mock Supabase ----
// Le mock expose un objet `chain` accessible depuis les tests via vi.mocked()
// pour configurer les réponses per-describe avec mockResolvedValueOnce.
const mockSingle = vi.fn();
const mockEq = vi.fn();

vi.mock('../server/db/supabase.js', () => {
  const thenCb = vi.fn().mockImplementation(
    (resolve: (v: { data: any[]; error: null }) => void) =>
      resolve({ data: [{ id: '550e8400-e29b-41d4-a716-446655440000', destination: 'Tokyo', mode: 'party', score: 0.8, departure: '2025-06-01', budget: '2000' }], error: null })
  );

  const chain = {
    insert:  vi.fn().mockReturnThis(),
    select:  vi.fn().mockReturnThis(),
    update:  vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    neq:     vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    range:   vi.fn().mockReturnThis(),
    limit:   vi.fn().mockReturnThis(),
    single:  vi.fn().mockResolvedValue({ data: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'pilot@tripgenie.test', name: 'Test Pilot', destination: 'Tokyo', mode: 'party', departure: '2025-06-01', budget: '2000', status: 'draft', password: '$2b$hashed' }, error: null }),
    then:    thenCb
  };

  return { default: { from: vi.fn().mockReturnValue(chain) } };
});

vi.mock('../server/services/claude/index.js', () => ({
  chatIntake:          vi.fn().mockResolvedValue({ response: 'Bonjour !', chips: ['Paris', 'Tokyo'], extractedData: {}, isReady: false }),
  chatModify:          vi.fn().mockResolvedValue({ reply: 'Modifications appliquées.', modifications: {} }),
  assemblePack:        vi.fn().mockResolvedValue({
    destination: 'Tokyo', country: 'Japon', tagline: 'La ville qui ne dort jamais',
    overview: 'Tokyo...', hotels: [], activities: [], flights: [], itinerary: [],
    events: [], budget_breakdown: { vols: '0€', hebergement: '0€', activites: '0€', restauration: '0€', transports: '0€', divers: '0€', total: '2000€' },
    summary: { total_budget: '2000€', nights: 4, activities_count: 0 }
  }),
  suggestDestinations: vi.fn().mockResolvedValue({ destinations: [{ name: 'Tokyo' }] }),
  analyzeRequest:      vi.fn().mockResolvedValue({ destination: 'Tokyo', mode: 'party' })
}));

vi.mock('../server/services/smartSearch.js', () => ({
  smartFlightSearch: vi.fn().mockResolvedValue(null),
  smartEventsSearch: vi.fn().mockResolvedValue([]),
  smartHotelSearch:  vi.fn().mockResolvedValue([])
}));

vi.mock('../server/services/weather.js', () => ({
  getRealWeather: vi.fn().mockResolvedValue({ temp: '20°C', cond: 'Ensoleillé' })
}));

vi.mock('../server/services/photo.js', () => ({
  getDestinationPhoto: vi.fn().mockResolvedValue('https://example.com/photo.jpg')
}));

// ============================================================
// 1 — HEALTH CHECK
// ============================================================

describe('❤️ GET /api/health', () => {
  it('renvoie status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ============================================================
// 2 — AUTH — Validation (pas de vraie BDD nécessaire)
// ============================================================

describe('🔐 Auth — Validation des inputs', () => {

  it('POST /register — 400 si email invalide', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'pas-un-email', password: 'Password123!', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it('POST /register — 400 si mot de passe trop court', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'ok@test.com', password: '123', name: 'Test' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/passe/i);
  });

  it('POST /register — 201 avec utilisateur créé (mock)', async () => {
    // Le mock supabase retourne null au 1er appel (email libre) puis l'utilisateur créé
    const { default: supabase } = await import('../server/db/supabase.js');
    const chain = supabase.from('users') as any;
    chain.single
      .mockResolvedValueOnce({ data: null, error: null })           // email non pris
      .mockResolvedValueOnce({ data: { id: TEST_TRIP_ID, email: 'pilot@tripgenie.test', name: 'Test Pilot' }, error: null }); // utilisateur créé

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'pilot@tripgenie.test', password: 'Password123!', name: 'Test Pilot' });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
  });

  it('POST /login — 200 avec token (mock)', async () => {
    // Le mock bcrypt.compare retourne true par défaut
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pilot@tripgenie.test', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
  });

  it('GET /me — 401 sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me — 200 avec Bearer token valide', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(TEST_USER.email);
  });

  it('POST /logout — 200 et efface le cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

// ============================================================
// 3 — TRIPS — Validation (requiert auth)
// ============================================================

describe('🗺️ Trips — Validation Zod', () => {

  it('POST — 401 sans token', async () => {
    const res = await request(app)
      .post('/api/trips')
      .send({ destination: 'Tokyo', mode: 'party' });
    expect(res.status).toBe(401);
  });

  it('POST — 400 si mode invalide', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ destination: 'Tokyo', mode: 'mode_invalide' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mode invalide/i);
  });

  it('POST — 400 si destination vide', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ destination: '', mode: 'party' });
    expect(res.status).toBe(400);
  });

  it('POST — 201 avec données valides (mock)', async () => {
    const res = await request(app)
      .post('/api/trips')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ destination: 'Tokyo', mode: 'party', departure: '2025-06-01', budget: 2000 });
    expect(res.status).toBe(201);
    expect(res.body.trip).toBeDefined();
  });

  it('GET / — 200 retourne la liste des voyages', async () => {
    const res = await request(app)
      .get('/api/trips')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trips)).toBe(true);
  });

  it('GET /:id — 200 retourne un voyage (mock)', async () => {
    const res = await request(app)
      .get(`/api/trips/${TEST_TRIP_ID}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.trip).toBeDefined();
  });

  it('GET /share/:id — 200 accès public', async () => {
    const res = await request(app).get(`/api/trips/share/${TEST_TRIP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.trip).toBeDefined();
  });

  it('DELETE /:id — 401 sans token', async () => {
    const res = await request(app).delete(`/api/trips/${TEST_TRIP_ID}`);
    expect(res.status).toBe(401);
  });

  it('PUT /:id — 400 si statut invalide', async () => {
    const res = await request(app)
      .put(`/api/trips/${TEST_TRIP_ID}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'statut_invalide' });
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 4 — VOTES — Validation
// ============================================================

describe('🗳️ Votes — Validation', () => {

  it('POST — 400 si trip_id n\'est pas un UUID', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ trip_id: 'pas-un-uuid', item_id: 'hotel-1', vote_type: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalide/i);
  });

  it('POST — 400 si item_id absent', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ trip_id: TEST_TRIP_ID, vote_type: true });
    expect(res.status).toBe(400);
  });

  it('POST — 201 vote valide (mock)', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ trip_id: TEST_TRIP_ID, item_id: 'hotel-ritz', vote_type: true, voter_name: 'Alice' });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /:trip_id — 200 retourne les votes', async () => {
    const res = await request(app).get(`/api/votes/${TEST_TRIP_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.votes).toBeDefined();
  });
});

// ============================================================
// 5 — AI — Validation des inputs
// ============================================================

describe('🤖 AI — Validation des inputs', () => {

  it('POST /generate — 400 sans destination', async () => {
    const res = await request(app)
      .post('/api/ai/generate')
      .send({ departure: '2025-06-01', budget: 2000 });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('fail');
  });

  it('POST /generate — 400 sans date de départ', async () => {
    const res = await request(app)
      .post('/api/ai/generate')
      .send({ destination: 'Tokyo', budget: 2000 });
    expect(res.status).toBe(400);
  });

  it('POST /generate — 400 budget à zéro', async () => {
    const res = await request(app)
      .post('/api/ai/generate')
      .send({ destination: 'Tokyo', departure: '2025-06-01', budget: 0 });
    expect(res.status).toBe(400);
  });

  it('POST /onboarding — 400 sans userMessage', async () => {
    const res = await request(app)
      .post('/api/ai/onboarding')
      .send({ currentData: {} });
    expect(res.status).toBe(400);
  });

  it('POST /onboarding — 200 avec message valide (mock)', async () => {
    const res = await request(app)
      .post('/api/ai/onboarding')
      .send({ userMessage: 'Je veux aller à Tokyo', currentData: {} });
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
  });

  it('POST /chat — 400 message vide', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: '', current_pack: { destination: 'Tokyo' } });
    expect(res.status).toBe(400);
  });

  it('POST /analyze — 400 sans input', async () => {
    const res = await request(app)
      .post('/api/ai/analyze')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/input/i);
  });

  it('POST /analyze — 400 input trop long', async () => {
    const res = await request(app)
      .post('/api/ai/analyze')
      .send({ input: 'A'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/long/i);
  });

  it('POST /destinations — 400 sans mode', async () => {
    const res = await request(app)
      .post('/api/ai/destinations')
      .send({ budget: 2000, travelers: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mode/i);
  });

  it('POST /destinations — 200 avec mode valide (mock)', async () => {
    const res = await request(app)
      .post('/api/ai/destinations')
      .send({ mode: 'party', budget: 2000, travelers: 2, origin: 'Paris' });
    expect(res.status).toBe(200);
    expect(res.body.destinations).toBeDefined();
  });
});

// ============================================================
// 6 — TRIPS AVANCÉS (DELETE, PUT succès)
// ============================================================

describe('🗺️ Trips — DELETE et PUT succès', () => {

  it('DELETE /:id — 200 avec token valide', async () => {
    const res = await request(app)
      .delete(`/api/trips/${TEST_TRIP_ID}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/supprim/i);
  });

  it('PUT /:id — 200 met à jour le statut confirmed', async () => {
    const res = await request(app)
      .put(`/api/trips/${TEST_TRIP_ID}`)
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.trip).toBeDefined();
  });

  it('GET / — filtre par mode', async () => {
    const res = await request(app)
      .get('/api/trips?mode=party')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trips)).toBe(true);
  });

  it('GET / — pagination avec limit et offset', async () => {
    const res = await request(app)
      .get('/api/trips?limit=5&offset=0')
      .set('Authorization', `Bearer ${TEST_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(5);
    expect(res.body.offset).toBe(0);
  });
});

// ============================================================
// 7 — AUTH AVANCÉ (mauvais mot de passe, email déjà pris)
// ============================================================

describe('🔐 Auth — cas limites', () => {

  it('POST /login — 401 si mot de passe incorrect (mock bcrypt false)', async () => {
    const { default: bcrypt } = await import('bcryptjs');
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pilot@tripgenie.test', password: 'mauvais_mdp' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('POST /signup — 409 si email déjà utilisé', async () => {
    const { default: supabase } = await import('../server/db/supabase.js');
    const chain = supabase.from('users') as any;
    // Simule qu'un utilisateur existe déjà avec cet email
    chain.single.mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'existant@test.com', password: 'Password123!', name: 'Déjà là' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/déjà utilisé/i);
  });

  it('POST /logout — efface le cookie tg_token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie?.toString()).toMatch(/tg_token/);
  });
});

// ============================================================
// 8 — ERROR HANDLING
// ============================================================

describe('🚫 Error Handling', () => {

  it('route inconnue — 404', async () => {
    const res = await request(app).get('/api/cette-route-nexiste-pas');
    expect(res.status).toBe(404);
  });

  it('POST /auth/register — 400 Zod si payload vide', async () => {
    const res = await request(app).post('/api/auth/signup').send({});
    expect(res.status).toBe(400);
  });
});
