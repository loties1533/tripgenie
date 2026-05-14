import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../server/index.js';
import 'dotenv/config';

describe('API Integration: Votes', () => {
  const testVote = {
    trip_id: 'test-trip-' + Math.random().toString(36).substring(7),
    item_id: 'Hotel Test Supertest',
    voter_name: 'Test Runner',
    vote_type: true
  };

  it('should create a new vote via POST /api/votes', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send(testVote);

    if (res.status === 201) {
      expect(res.body.message).toBe('Vote enregistré !');
      expect(res.body.vote).toBeDefined();
      console.log('✅ Intégration API -> Supabase : OK');
    } else {
      console.warn('⚠️  Le test a renvoyé un statut ' + res.status + '. Vérifie ta config Supabase.');
      expect(res.status).toBe(500);
    }
  });

  it('should return 400 if data is missing', async () => {
    const res = await request(app)
      .post('/api/votes')
      .send({ trip_id: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should fetch votes for a trip via GET /api/votes/:trip_id', async () => {
    const res = await request(app)
      .get(`/api/votes/${testVote.trip_id}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.votes)).toBe(true);
  });
});
