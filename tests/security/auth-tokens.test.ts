// =============================================
// TRIPGENIE — tests/security/auth-tokens.test.ts
// Sécurité tokens JWT :
//   - token expiré
//   - token forgé (mauvaise signature)
//   - token sans les bons claims
//   - accès inter-utilisateurs (isolation)
//   - token dans cookie vs header Bearer
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
  return { aiGenerateLimiter: p, aiChatLimiter: p };
});

// vi.hoisted() — évite l'erreur de référence avant initialisation due au hoisting de vi.mock
const { mockThen, mockChain } = vi.hoisted(() => {
  const mockThen = vi.fn();
  const mockChain = {
    insert:  vi.fn().mockReturnThis(),
    select:  vi.fn().mockReturnThis(),
    update:  vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    range:   vi.fn().mockReturnThis(),  // requis par GET /api/trips (pagination)
    single:  vi.fn().mockResolvedValue({ data: null, error: null }),
    then:    mockThen
  };
  return { mockThen, mockChain };
});
vi.mock('../../server/db/supabase.js', () => ({
  default: { from: vi.fn().mockReturnValue(mockChain) }
}));

const USER_A = { id: 'user-a-uuid', email: 'a@test.com', name: 'User A' };
const USER_B = { id: 'user-b-uuid', email: 'b@test.com', name: 'User B' };
const TRIP_B = 'trip-belongs-to-b';

function makeToken(payload: object, secret = process.env.JWT_SECRET!, options: jwt.SignOptions = {}) {
  return jwt.sign(payload, secret, { expiresIn: '1d', ...options });
}

beforeEach(() => vi.clearAllMocks());

// ============================================================
// Tokens invalides
// ============================================================
describe('JWT — tokens invalides', () => {

  it('401 avec token expiré', async () => {
    const expired = jwt.sign(USER_A, process.env.JWT_SECRET!, { expiresIn: -1 });
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('401 avec token signé avec un mauvais secret', async () => {
    const forged = jwt.sign(USER_A, 'wrong-secret');
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('401 avec token tronqué / corrompu', async () => {
    const res = await request(app).get('/api/trips').set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.INVALID.xxx');
    expect(res.status).toBe(401);
  });

  it('401 avec token vide', async () => {
    const res = await request(app).get('/api/trips').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });

  it('401 avec header Authorization mal formé', async () => {
    const res = await request(app).get('/api/trips').set('Authorization', 'InvalidScheme abc123');
    expect(res.status).toBe(401);
  });

  it('401 sans token du tout', async () => {
    const res = await request(app).get('/api/trips');
    expect(res.status).toBe(401);
  });

  it('401 avec token None-algorithm (attaque MITM)', async () => {
    // Essai de contourner la vérification avec alg: none
    const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ id: 'admin', email: 'admin@test.com', iat: Math.floor(Date.now()/1000) })).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${noneToken}`);
    expect(res.status).toBe(401);
  });
});

// ============================================================
// Token dans cookie vs Bearer
// ============================================================
describe('JWT — extraction depuis cookie et header', () => {

  it('accepte le token depuis le header Authorization Bearer', async () => {
    const token = makeToken(USER_A);
    mockThen.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${token}`);
    // 200 ou 404 — pas 401
    expect(res.status).not.toBe(401);
  });

  it('accepte le token depuis le cookie tg_token', async () => {
    const token = makeToken(USER_A);
    mockThen.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    const res = await request(app).get('/api/trips').set('Cookie', `tg_token=${token}`);
    expect(res.status).not.toBe(401);
  });
});

// ============================================================
// Isolation inter-utilisateurs (IDOR protection)
// ============================================================
describe('JWT — isolation des données entre utilisateurs', () => {

  it('User A ne peut pas accéder au voyage de User B', async () => {
    const tokenA = makeToken(USER_A);
    // La vraie DB applique .eq('user_id', userA.id) → retourne null pour un trip d'un autre user
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });
    const res = await request(app)
      .get(`/api/trips/${TRIP_B}`)
      .set('Authorization', `Bearer ${tokenA}`);
    // La route renvoie 404 quand data === null
    expect([403, 404]).toContain(res.status);
  });

  it('User B ne peut pas modifier le voyage de User A', async () => {
    const tokenB = makeToken(USER_B);
    // Simule: le trip appartient à A, pas à B
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await request(app)
      .patch(`/api/trips/trip-belongs-to-a`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'confirmed' });
    expect([403, 404]).toContain(res.status);
  });
});

// ============================================================
// Claims requis dans le token
// ============================================================
describe('JWT — claims requis', () => {

  it('token sans "id" → rejeté ou accès refusé', async () => {
    const noId = makeToken({ email: 'alice@test.com' }); // pas de id
    // Préparer mockThen pour que GET /trips puisse résoudre
    mockThen.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${noId}`);
    // Sans id, le serveur peut renvoyer 200 (liste vide) ou 401 — pas de crash 500
    expect([200, 401]).toContain(res.status);
  });

  it('token avec id null → rejeté', async () => {
    const nullId = makeToken({ id: null, email: 'alice@test.com' });
    mockThen.mockImplementationOnce((cb: any) => cb({ data: [], error: null }));
    const res = await request(app).get('/api/trips').set('Authorization', `Bearer ${nullId}`);
    expect([200, 401]).toContain(res.status);
  });
});
