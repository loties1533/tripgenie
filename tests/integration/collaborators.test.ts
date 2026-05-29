// =============================================
// TRIPGENIE — tests/integration/collaborators.test.ts
// Route collaborateurs (relation many-to-many trips ↔ users) :
//   - auth requise (401 sans token)
//   - propriété du voyage vérifiée avant toute action (404 sinon)
//   - POST : email valide, utilisateur existant, pas d'auto-invitation
//   - DELETE : retrait d'un collaborateur
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

// mockThen : pour les requêtes awaitées sans .single() (liste + delete)
const { mockChain, mockThen } = vi.hoisted(() => {
  const mockThen = vi.fn();
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then:   mockThen
  };
  return { mockChain, mockThen };
});
vi.mock('../../server/db/supabase.js', () => ({
  default: { from: vi.fn().mockReturnValue(mockChain) }
}));

const OWNER = { id: 'owner-uuid', email: 'owner@test.com', name: 'Owner' };
const token = jwt.sign(OWNER, process.env.JWT_SECRET!, { expiresIn: '1d' });
const auth  = (r: any) => r.set('Authorization', `Bearer ${token}`);
const TRIP  = 'trip-123';

beforeEach(() => {
  vi.clearAllMocks();
  // mockReset vide aussi la file "Once" → isolation stricte entre tests
  mockChain.single.mockReset().mockResolvedValue({ data: null, error: null });
  mockThen.mockReset().mockImplementation((cb: any) => cb({ data: [], error: null }));
  mockChain.insert.mockReturnThis();
  mockChain.select.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.upsert.mockReturnThis();
  mockChain.delete.mockReturnThis();
  mockChain.eq.mockReturnThis();
});

// ============================================================
// GET /api/trips/:id/collaborators
// ============================================================
describe('GET /api/trips/:id/collaborators', () => {

  it('401 sans token', async () => {
    const res = await request(app).get(`/api/trips/${TRIP}/collaborators`);
    expect(res.status).toBe(401);
  });

  it('404 si le voyage n\'appartient pas à l\'utilisateur', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await auth(request(app).get(`/api/trips/${TRIP}/collaborators`));
    expect(res.status).toBe(404);
  });

  it('liste les collaborateurs du voyage', async () => {
    mockChain.single.mockResolvedValueOnce({ data: { id: TRIP }, error: null }); // propriété OK
    mockThen.mockImplementationOnce((cb: any) => cb({
      data: [{ user_id: 'u2', role: 'viewer', invited_at: '2026-01-01', users: { name: 'Bob', email: 'bob@test.com' } }],
      error: null
    }));
    const res = await auth(request(app).get(`/api/trips/${TRIP}/collaborators`));
    expect(res.status).toBe(200);
    expect(res.body.collaborators).toHaveLength(1);
    expect(res.body.collaborators[0].role).toBe('viewer');
  });
});

// ============================================================
// POST /api/trips/:id/collaborators
// ============================================================
describe('POST /api/trips/:id/collaborators', () => {

  it('401 sans token', async () => {
    const res = await request(app).post(`/api/trips/${TRIP}/collaborators`).send({ email: 'bob@test.com' });
    expect(res.status).toBe(401);
  });

  it('400 si email invalide', async () => {
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'pas-un-email' });
    expect(res.status).toBe(400);
  });

  it('404 si le voyage n\'appartient pas à l\'utilisateur', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'bob@test.com' });
    expect(res.status).toBe(404);
  });

  it('404 si l\'utilisateur invité n\'existe pas', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TRIP }, error: null })            // propriété OK
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });   // user introuvable
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'ghost@test.com' });
    expect(res.status).toBe(404);
  });

  it('400 si l\'on tente de s\'inviter soi-même', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TRIP }, error: null })                                       // propriété OK
      .mockResolvedValueOnce({ data: { id: OWNER.id, name: OWNER.name, email: OWNER.email }, error: null }); // = soi-même
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: OWNER.email });
    expect(res.status).toBe(400);
  });

  it('201 invite un collaborateur valide (rôle editor)', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TRIP }, error: null })                                            // propriété OK
      .mockResolvedValueOnce({ data: { id: 'bob-uuid', name: 'Bob', email: 'bob@test.com' }, error: null })  // user trouvé
      .mockResolvedValueOnce({ data: { trip_id: TRIP, user_id: 'bob-uuid', role: 'editor' }, error: null }); // upsert
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'bob@test.com', role: 'editor' });
    expect(res.status).toBe(201);
    expect(res.body.collaborator.role).toBe('editor');
    expect(res.body.user.email).toBe('bob@test.com');
    expect(mockChain.upsert).toHaveBeenCalled();
  });
});

// ============================================================
// DELETE /api/trips/:id/collaborators/:user_id
// ============================================================
describe('DELETE /api/trips/:id/collaborators/:user_id', () => {

  it('401 sans token', async () => {
    const res = await request(app).delete(`/api/trips/${TRIP}/collaborators/bob-uuid`);
    expect(res.status).toBe(401);
  });

  it('404 si le voyage n\'appartient pas à l\'utilisateur', async () => {
    mockChain.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    const res = await auth(request(app).delete(`/api/trips/${TRIP}/collaborators/bob-uuid`));
    expect(res.status).toBe(404);
  });

  it('200 retire le collaborateur', async () => {
    mockChain.single.mockResolvedValueOnce({ data: { id: TRIP }, error: null }); // propriété OK
    mockThen.mockImplementationOnce((cb: any) => cb({ error: null }));            // delete OK
    const res = await auth(request(app).delete(`/api/trips/${TRIP}/collaborators/bob-uuid`));
    expect(res.status).toBe(200);
    expect(mockChain.delete).toHaveBeenCalled();
  });
});
