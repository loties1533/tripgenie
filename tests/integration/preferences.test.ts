// =============================================
// TRIPGENIE — tests/integration/preferences.test.ts
// Route préférences utilisateur (relation 1-1 avec users) :
//   - auth requise (401 sans token)
//   - GET : null si aucune préférence (PGRST116), sinon l'objet stocké
//   - PUT : validation Zod (mode, devise, nb d'intérêts) + upsert
// Supabase et rate-limiters mockés — seul le middleware auth tourne réellement.
// =============================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../server/index.js';

process.env.JWT_SECRET = 'test-secret-for-vitest';

vi.mock('express-rate-limit', () => ({
  default:   () => (_: any, __: any, next: any) => next(),
  rateLimit: () => (_: any, __: any, next: any) => next()
}));
vi.mock('../../server/middleware/limiter.js', () => {
  const p = (_: any, __: any, n: any) => n();
  return { aiGenerateLimiter: p, aiChatLimiter: p, authLimiter: p };
});

// (mock supabase retiré — la route preferences tourne 100 % sur pg/RLS maison)

// Mock pg (RLS « maison ») : GET/PUT préférences passent par withUser() + SQL direct.
const { mockPgQuery } = vi.hoisted(() => ({ mockPgQuery: vi.fn() }));
vi.mock('../../server/db/pg.js', () => ({
  default:  {},
  query:    (...args: any[]) => mockPgQuery(...args),
  withUser: vi.fn(async (_userId: string, fn: (c: any) => any) => fn({ query: mockPgQuery })),
}));

const USER  = { id: 'user-uuid', email: 'u@test.com', name: 'User' };
const token = jwt.sign(USER, process.env.JWT_SECRET!, { expiresIn: '1d' });
const auth  = (r: any) => r.set('Authorization', `Bearer ${token}`);

beforeEach(() => {
  vi.clearAllMocks();
  // Défaut fail-closed : aucune ligne. Chaque test fournit ses lignes via Once.
  mockPgQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
});

// ============================================================
// GET /api/preferences
// ============================================================
describe('GET /api/preferences', () => {

  it('401 sans token', async () => {
    const res = await request(app).get('/api/preferences');
    expect(res.status).toBe(401);
  });

  it('preferences = null si aucune ligne', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await auth(request(app).get('/api/preferences'));
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeNull();
  });

  it('retourne les préférences existantes', async () => {
    const prefs = { user_id: USER.id, default_mode: 'luxury', currency: 'EUR', home_city: 'Lyon', preferred_prefs: ['culture'] };
    mockPgQuery.mockResolvedValueOnce({ rows: [prefs], rowCount: 1 });
    const res = await auth(request(app).get('/api/preferences'));
    expect(res.status).toBe(200);
    expect(res.body.preferences.default_mode).toBe('luxury');
    expect(res.body.preferences.home_city).toBe('Lyon');
  });

  it('500 si une vraie erreur DB', async () => {
    // La requête SQL rejette (ex: table absente) → next(err) → handler global 500
    mockPgQuery.mockRejectedValueOnce(new Error('table absente'));
    const res = await auth(request(app).get('/api/preferences'));
    expect(res.status).toBe(500);
  });
});

// ============================================================
// PUT /api/preferences
// ============================================================
describe('PUT /api/preferences', () => {

  it('401 sans token', async () => {
    const res = await request(app).put('/api/preferences').send({ default_mode: 'luxury' });
    expect(res.status).toBe(401);
  });

  it('400 si default_mode hors énumération', async () => {
    const res = await auth(request(app).put('/api/preferences')).send({ default_mode: 'casino' });
    expect(res.status).toBe(400);
  });

  it('400 si devise != 3 caractères', async () => {
    const res = await auth(request(app).put('/api/preferences')).send({ currency: 'EURO' });
    expect(res.status).toBe(400);
  });

  it('400 si plus de 10 centres d\'intérêt', async () => {
    const res = await auth(request(app).put('/api/preferences'))
      .send({ preferred_prefs: Array.from({ length: 11 }, (_, i) => `p${i}`) });
    expect(res.status).toBe(400);
  });

  it('200 + upsert avec des données valides', async () => {
    const prefs = { user_id: USER.id, default_mode: 'relax', currency: 'USD', home_city: 'Nice', preferred_prefs: ['plage', 'nature'] };
    mockPgQuery.mockResolvedValueOnce({ rows: [prefs], rowCount: 1 });
    const res = await auth(request(app).put('/api/preferences'))
      .send({ default_mode: 'relax', currency: 'USD', home_city: 'Nice', preferred_prefs: ['plage', 'nature'] });
    expect(res.status).toBe(200);
    expect(res.body.preferences.default_mode).toBe('relax');
    // L'upsert est un INSERT ... ON CONFLICT (user_id) DO UPDATE en SQL paramétré
    expect(String(mockPgQuery.mock.calls.at(-1)?.[0])).toMatch(/ON CONFLICT/i);
  });

  it('accepte un body partiel (tous les champs sont optionnels)', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [{ user_id: USER.id, home_city: 'Bordeaux' }], rowCount: 1 });
    const res = await auth(request(app).put('/api/preferences')).send({ home_city: 'Bordeaux' });
    expect(res.status).toBe(200);
    expect(res.body.preferences.home_city).toBe('Bordeaux');
  });
});
