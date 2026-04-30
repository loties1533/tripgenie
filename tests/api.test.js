import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server/index.js';

describe('🚀 TripGenie API Comprehensive Test Suite', () => {
  let authToken = '';
  const testUser = {
    email: `test_${Date.now()}@tripgenie.test`,
    password: 'Password123!',
    name: 'Test Pilot'
  };

  // --- HEALTH CHECK ---
  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  // --- AUTHENTICATION ---
  describe('🔐 Auth Endpoints', () => {
    it('should signup a new user (201)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);
      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
    });

    it('should fail signup with existing email (409)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);
      expect(res.status).toBe(409);
    });

    it('should login and return a token (200)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('should fail login with wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword' });
      expect(res.status).toBe(401);
    });

    it('should return user info with valid token (200)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    });

    it('should update user profile (200)', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('should deny access to /me without token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // --- TRIPS ---
  describe('🗺️ Trip Endpoints', () => {
    let tripId = '';

    it('should create a new trip (201)', async () => {
      const res = await request(app)
        .post('/api/trips')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          destination: 'Tokyo',
          mode: 'party',
          departure: '2025-06-01',
          budget: 2000
        });
      expect(res.status).toBe(201);
      expect(res.body.trip.id).toBeDefined();
      tripId = res.body.trip.id;
    });

    it('should list user trips (200)', async () => {
      const res = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.trips)).toBe(true);
    });

    it('should get a specific trip (200)', async () => {
      const res = await request(app)
        .get(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
      expect(res.body.trip.destination).toBe('Tokyo');
    });

    it('should allow public access via share link (200)', async () => {
      const res = await request(app).get(`/api/trips/share/${tripId}`);
      expect(res.status).toBe(200);
      expect(res.body.trip.id).toBe(tripId);
    });

    it('should update a trip (200)', async () => {
      const res = await request(app)
        .put(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Trip Title' });
      expect(res.status).toBe(200);
      expect(res.body.trip.title).toBe('New Trip Title');
    });

    it('should delete a trip (200)', async () => {
      const res = await request(app)
        .delete(`/api/trips/${tripId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(200);
    });
  });

  // --- VOTES ---
  describe('🗳️ Vote Endpoints', () => {
    it('should record a vote (201)', async () => {
      // On récupère le dernier trip créé pour voter dessus
      const tripRes = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`);
      const tripId = tripRes.body.trips[0].id;

      const res = await request(app)
        .post('/api/votes')
        .send({
          trip_id: tripId,
          item_id: 'hotel-123',
          voter_name: 'Test Voter',
          vote_type: true
        });
      expect(res.status).toBe(201);
    });

    it('should fetch votes for a trip (200)', async () => {
      const tripRes = await request(app)
        .get('/api/trips')
        .set('Authorization', `Bearer ${authToken}`);
      const tripId = tripRes.body.trips[0].id;

      const res = await request(app).get(`/api/votes/${tripId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.votes)).toBe(true);
    });
  });

  // --- AI ---
  describe('🤖 AI Endpoints', () => {
    it('should analyze a user request (200)', async () => {
      const res = await request(app)
        .post('/api/ai/analyze')
        .send({ input: 'Je veux un voyage luxe à Paris' });
      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
    });

    it('should handle onboarding chat (200)', async () => {
      const res = await request(app)
        .post('/api/ai/onboarding')
        .send({ userMessage: 'Salut', currentData: {} });
      expect(res.status).toBe(200);
      expect(res.body.response).toBeDefined();
    });
  });

  // --- ERROR HANDLING ---
  describe('🚫 Error Handling', () => {
    it('should return 404 for unknown route', async () => {
      const res = await request(app).get('/api/unknown-route');
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid signup data (Zod)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'not-an-email' });
      expect(res.status).toBe(400);
    });
  });
});
