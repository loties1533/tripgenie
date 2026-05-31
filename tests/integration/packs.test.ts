// =============================================
// TRIPGENIE — tests/integration/packs.test.ts
// Route packs (relation 1-N : un voyage → plusieurs packs classés) :
//   - auth requise (401 sans token)
//   - propriété du voyage vérifiée (403 sinon)
//   - GET    : liste les packs d'un voyage, triés par rang
//   - POST   : sélectionne un pack (désélectionne les autres + confirme le trip)
// La table packs est peuplée par le pipeline de génération → route réellement utile.
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

// (mock supabase retiré — la route packs tourne 100 % sur pg/RLS maison)

// Mock pg (RLS « maison ») : packs passe par withUser() — propriété + lecture/maj
// dans une même transaction. Toutes les requêtes de la route traversent mockPgQuery.
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
const PACK  = 'pack-456';

beforeEach(() => {
  vi.clearAllMocks();
  // Défaut fail-closed : aucune ligne (→ 403/404). Chaque test fournit ses lignes via Once.
  mockPgQuery.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
});

// ============================================================
// GET /api/packs/:trip_id
// ============================================================
describe('GET /api/packs/:trip_id', () => {

  it('401 sans token', async () => {
    const res = await request(app).get(`/api/packs/${TRIP}`);
    expect(res.status).toBe(401);
  });

  it('403 si le voyage n\'appartient pas à l\'utilisateur', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // propriété : 0 ligne → null → 403
    const res = await auth(request(app).get(`/api/packs/${TRIP}`));
    expect(res.status).toBe(403);
  });

  it('liste les packs du voyage triés par rang', async () => {
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })  // 1) propriété OK
      .mockResolvedValueOnce({ rows: [                               // 2) packs triés
        { id: 'p1', rank: 1, selected: true },
        { id: 'p2', rank: 2, selected: false }
      ], rowCount: 2 });
    const res = await auth(request(app).get(`/api/packs/${TRIP}`));
    expect(res.status).toBe(200);
    expect(res.body.packs).toHaveLength(2);
    expect(res.body.packs[0].rank).toBe(1);
  });
});

// ============================================================
// POST /api/packs/:trip_id/select/:pack_id
// ============================================================
describe('POST /api/packs/:trip_id/select/:pack_id', () => {

  it('401 sans token', async () => {
    const res = await request(app).post(`/api/packs/${TRIP}/select/${PACK}`);
    expect(res.status).toBe(401);
  });

  it('403 si le voyage n\'appartient pas à l\'utilisateur', async () => {
    mockPgQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // propriété : 0 ligne → 403
    const res = await auth(request(app).post(`/api/packs/${TRIP}/select/${PACK}`));
    expect(res.status).toBe(403);
  });

  it('sélectionne le pack choisi et renvoie le pack', async () => {
    // Transaction atomique : propriété → existence pack → désélection → sélection → MAJ trip
    mockPgQuery
      .mockResolvedValueOnce({ rows: [{ id: TRIP }], rowCount: 1 })                  // 1) propriété OK
      .mockResolvedValueOnce({ rows: [{ id: PACK }], rowCount: 1 })                  // 2) pack existe
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })                              // 3) UPDATE selected=false
      .mockResolvedValueOnce({ rows: [{ id: PACK, selected: true }], rowCount: 1 }) // 4) UPDATE selected=true RETURNING
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });                            // 5) UPDATE trips
    const res = await auth(request(app).post(`/api/packs/${TRIP}/select/${PACK}`));
    expect(res.status).toBe(200);
    expect(res.body.pack.id).toBe(PACK);
    expect(res.body.pack.selected).toBe(true);
    expect(mockPgQuery).toHaveBeenCalled();
  });
});
