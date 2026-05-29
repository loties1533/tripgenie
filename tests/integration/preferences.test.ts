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

// vi.hoisted() — la factory de vi.mock est hoistée au top, mockChain doit exister avant
const { mockChain } = vi.hoisted(() => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null })
  };
  return { mockChain };
});
vi.mock('../../server/db/supabase.js', () => ({
  default: { from: vi.fn().mockReturnValue(mockChain) }
}));

const USER  = { id: 'user-uuid', email: 'u@test.com', name: 'User' };
const token = jwt.sign(USER, process.env.JWT_SECRET!, { expiresIn: '1d' });
const auth  = (r: any) => r.set('Authorization', `Bearer ${token}`);

beforeEach(() => {
  vi.clearAllMocks();
  // mockReset vide aussi la file "Once" (clearAllMocks ne la vide pas) → pas de fuite entre tests
  mockChain.single.mockReset().mockResolvedValue({ data: null, error: null });
  mockChain.insert.mockReturnThis();
  mockChain.select.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.upsert.mockReturnThis();
  mockChain.delete.mockReturnThis();
  mockChain.eq.mockReturnThis();
});

// ============================================================
// GET /api/preferences
// ============================================================
describe('GET /api/preferences', () => {

  it('401 sans token', async () => {
    const res = await request(app).get('/api/preferences');
    expect(res.status).toBe(401);
  });

  it('preferences = null si aucune ligne (PGRST116)', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await auth(request(app).get('/api/preferences'));
    expect(res.status).toBe(200);
    expect(res.body.preferences).toBeNull();
  });

  it('retourne les préférences existantes', async () => {
    const prefs = { user_id: USER.id, default_mode: 'luxury', currency: 'EUR', home_city: 'Lyon', preferred_prefs: ['culture'] };
    mockChain.single.mockResolvedValueOnce({ data: prefs, error: null });
    const res = await auth(request(app).get('/api/preferences'));
    expect(res.status).toBe(200);
    expect(res.body.preferences.default_mode).toBe('luxury');
    expect(res.body.preferences.home_city).toBe('Lyon');
  });

  it('500 si une vraie erreur DB (code != PGRST116)', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: '42P01', message: 'table absente' } });
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
    mockChain.single.mockResolvedValueOnce({ data: prefs, error: null });
    const res = await auth(request(app).put('/api/preferences'))
      .send({ default_mode: 'relax', currency: 'USD', home_city: 'Nice', preferred_prefs: ['plage', 'nature'] });
    expect(res.status).toBe(200);
    expect(res.body.preferences.default_mode).toBe('relax');
    expect(mockChain.upsert).toHaveBeenCalled();
  });

  it('accepte un body partiel (tous les champs sont optionnels)', async () => {
    mockChain.single.mockResolvedValueOnce({ data: { user_id: USER.id, home_city: 'Bordeaux' }, error: null });
    const res = await auth(request(app).put('/api/preferences')).send({ home_city: 'Bordeaux' });
    expect(res.status).toBe(200);
    expect(res.body.preferences.home_city).toBe('Bordeaux');
  });
});
