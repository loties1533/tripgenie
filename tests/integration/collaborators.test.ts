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

// (mock supabase retiré — la route collaborators tourne 100 % sur pg/RLS maison)

// Mock pg (RLS « maison ») : propriété vérifiée via withUser(), recherche cross-user
// (auth_user_by_email) et JOIN collaborateurs (trip_collaborators_for_owner) via query().
// Toutes les requêtes de la route traversent mockPgQuery, dans l'ordre.
const { mockPgQuery } = vi.hoisted(() => ({ mockPgQuery: vi.fn() }));
vi.mock('../../server/db/pg.js', () => ({
  default:  {},
  query:    (...args: any[]) => mockPgQuery(...args),
  withUser: vi.fn(async (_userId: string, fn: (c: any) => any) => fn({ query: mockPgQuery })),
}));

const OWNER = { id: 'owner-uuid', email: 'owner@test.com', name: 'Owner' };
const token = jwt.sign(OWNER, process.env.JWT_SECRET!, { expiresIn: '1d' });
const auth  = (r: any) => r.set('Authorization', `Bearer ${token}`);
const TRIP  = 'trip-123';

beforeEach(() => {
  vi.clearAllMocks();
  // Défaut fail-closed : aucune ligne (→ 404). Chaque test fournit ses lignes via Once.
  mockPgQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
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
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // propriété : 0 ligne → 404
    const res = await auth(request(app).get(`/api/trips/${TRIP}/collaborators`));
    expect(res.status).toBe(404);
  });

  it('liste les collaborateurs du voyage', async () => {
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })  // 1) propriété OK (withUser)
      // 2) trip_collaborators_for_owner renvoie des colonnes plates (name/email),
      //    que la route ré-emboîte ensuite sous users:{ name, email }.
      .mockResolvedValueOnce({ rows: [{ user_id: 'u2', role: 'viewer', invited_at: '2026-01-01', name: 'Bob', email: 'bob@test.com' }], rowCount: 1 });
    const res = await auth(request(app).get(`/api/trips/${TRIP}/collaborators`));
    expect(res.status).toBe(200);
    expect(res.body.collaborators).toHaveLength(1);
    expect(res.body.collaborators[0].role).toBe('viewer');
    expect(res.body.collaborators[0].users.email).toBe('bob@test.com');
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
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // propriété : 0 ligne → 404
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'bob@test.com' });
    expect(res.status).toBe(404);
  });

  it('404 si l\'utilisateur invité n\'existe pas', async () => {
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })  // 1) propriété OK
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });            // 2) auth_user_by_email vide → 404
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'ghost@test.com' });
    expect(res.status).toBe(404);
  });

  it('400 si l\'on tente de s\'inviter soi-même', async () => {
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })                                  // 1) propriété OK
      .mockResolvedValueOnce({ rows: [{ id: OWNER.id, name: OWNER.name, email: OWNER.email }], rowCount: 1 }); // 2) cible = soi-même
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: OWNER.email });
    expect(res.status).toBe(400);
  });

  it('201 invite un collaborateur valide (rôle editor)', async () => {
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })                                          // 1) propriété OK
      .mockResolvedValueOnce({ rows: [{ id: 'bob-uuid', name: 'Bob', email: 'bob@test.com' }], rowCount: 1 }) // 2) user trouvé
      .mockResolvedValueOnce({ rows: [{ trip_id: TRIP, user_id: 'bob-uuid', role: 'editor' }], rowCount: 1 }); // 3) INSERT ON CONFLICT
    const res = await auth(request(app).post(`/api/trips/${TRIP}/collaborators`)).send({ email: 'bob@test.com', role: 'editor' });
    expect(res.status).toBe(201);
    expect(res.body.collaborator.role).toBe('editor');
    expect(res.body.user.email).toBe('bob@test.com');
    expect(mockPgQuery).toHaveBeenCalled();
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
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // propriété : 0 ligne → 404
    const res = await auth(request(app).delete(`/api/trips/${TRIP}/collaborators/bob-uuid`));
    expect(res.status).toBe(404);
  });

  it('200 retire le collaborateur', async () => {
    // Transaction : propriété OK → DELETE du collaborateur
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })  // 1) propriété OK
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });             // 2) DELETE trip_collaborators
    const res = await auth(request(app).delete(`/api/trips/${TRIP}/collaborators/bob-uuid`));
    expect(res.status).toBe(200);
    expect(mockPgQuery).toHaveBeenCalled();
  });
});
