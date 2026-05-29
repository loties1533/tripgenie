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

// mockThen : pour les requêtes awaitées sans .single() (liste triée, updates)
const { mockChain, mockThen } = vi.hoisted(() => {
  const mockThen = vi.fn();
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
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
const PACK  = 'pack-456';

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.single.mockReset().mockResolvedValue({ data: null, error: null });
  mockThen.mockReset().mockImplementation((cb: any) => cb({ data: [], error: null }));
  mockChain.insert.mockReturnThis();
  mockChain.select.mockReturnThis();
  mockChain.update.mockReturnThis();
  mockChain.upsert.mockReturnThis();
  mockChain.delete.mockReturnThis();
  mockChain.eq.mockReturnThis();
  mockChain.order.mockReturnThis();
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
    mockChain.single.mockResolvedValueOnce({ data: null, error: null }); // trip introuvable pour cet user
    const res = await auth(request(app).get(`/api/packs/${TRIP}`));
    expect(res.status).toBe(403);
  });

  it('liste les packs du voyage triés par rang', async () => {
    mockChain.single.mockResolvedValueOnce({ data: { id: TRIP }, error: null }); // propriété OK
    mockThen.mockImplementationOnce((cb: any) => cb({
      data: [
        { id: 'p1', rank: 1, selected: true },
        { id: 'p2', rank: 2, selected: false }
      ],
      error: null
    }));
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
    mockChain.single.mockResolvedValueOnce({ data: null, error: null });
    const res = await auth(request(app).post(`/api/packs/${TRIP}/select/${PACK}`));
    expect(res.status).toBe(403);
  });

  it('sélectionne le pack choisi et renvoie le pack', async () => {
    mockChain.single
      .mockResolvedValueOnce({ data: { id: TRIP }, error: null })                  // propriété OK
      .mockResolvedValueOnce({ data: { id: PACK, selected: true }, error: null }); // pack sélectionné
    const res = await auth(request(app).post(`/api/packs/${TRIP}/select/${PACK}`));
    expect(res.status).toBe(200);
    expect(res.body.pack.id).toBe(PACK);
    expect(res.body.pack.selected).toBe(true);
    expect(mockChain.update).toHaveBeenCalled();
  });
});
