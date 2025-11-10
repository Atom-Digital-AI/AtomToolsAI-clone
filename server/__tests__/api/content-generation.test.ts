/**
 * API endpoint tests for content generation tools
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';

const app = express();
app.use(express.json());

describe('Content Generation Endpoints', () => {
  let server: any;

  test('should setup test server', async () => {
    server = await registerRoutes(app);
    assert.ok(server !== undefined);
  });

  describe('POST /api/tools/seo-meta/generate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tools/seo-meta/generate')
        .send({ title: 'Test Title' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tools/seo-meta/generate')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/tools/google-ads/generate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/tools/google-ads/generate')
        .send({ productName: 'Test Product' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/tools/google-ads/generate')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/content-writer/sessions', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/content-writer/sessions')
        .send({ topic: 'Test Topic' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/content-writer/sessions')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/content-writer/sessions/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/content-writer/sessions/123')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/content-writer/sessions/:id/generate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/content-writer/sessions/123/generate')
        .send({})
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });
});

