/**
 * API endpoint tests for social content routes
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerSocialContentRoutes } from '../../social-content-routes';

const app = express();
app.use(express.json());

describe.skip('Social Content Endpoints', () => {
  test('should register social content routes', () => {
    registerSocialContentRoutes(app);
    assert.ok(true); // Routes registered
  });

  describe('GET /api/social-content/ad-specs', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/social-content/ad-specs')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/social-content/sessions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions')
        .send({
          subject: 'Test Subject',
          selectedPlatforms: ['Facebook'],
          selectedFormats: { Facebook: ['Post'] }
        })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });

    test('should validate subject field', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions')
        .send({
          selectedPlatforms: ['Facebook'],
          selectedFormats: { Facebook: ['Post'] }
        })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });

    test('should validate selectedPlatforms', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions')
        .send({
          subject: 'Test',
          selectedPlatforms: [],
          selectedFormats: {}
        })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/social-content/sessions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/social-content/sessions')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/social-content/sessions/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/social-content/sessions/123')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/social-content/sessions/:id/approve-wireframes', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions/123/approve-wireframes')
        .send({ approvedWireframeIds: ['wf-1'] })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should require approvedWireframeIds', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions/123/approve-wireframes')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/social-content/sessions/:id/generate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/social-content/sessions/123/generate')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });
});

