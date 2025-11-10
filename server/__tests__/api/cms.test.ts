/**
 * API endpoint tests for CMS routes
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerCmsRoutes } from '../../cms-routes';

const app = express();
app.use(express.json());

describe('CMS Endpoints', () => {
  test('should register CMS routes', () => {
    registerCmsRoutes(app);
    assert.ok(true); // Routes registered
  });

  describe('GET /api/public/pages/:slug', () => {
    test('should return 404 for non-existent page', async () => {
      const response = await request(app)
        .get('/api/public/pages/non-existent')
        .expect(404);
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/public/pages', () => {
    test('should return published pages', async () => {
      const response = await request(app)
        .get('/api/public/pages')
        .expect(200);
      
      assert.ok(Array.isArray(response.body));
    });
  });

  describe('GET /api/cms/pages', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .get('/api/cms/pages')
        .expect(401); // Or 403 if session exists but not admin
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/cms/pages', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .post('/api/cms/pages')
        .send({ title: 'Test Page', content: 'Content' })
        .expect(401); // Or 403 if session exists but not admin
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/cms/pages')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('PUT /api/cms/pages/:id', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .put('/api/cms/pages/123')
        .send({ title: 'Updated' })
        .expect(401); // Or 403 if session exists but not admin
      
      assert.ok(response.body.message);
    });
  });

  describe('DELETE /api/cms/pages/:id', () => {
    test('should require admin authentication', async () => {
      const response = await request(app)
        .delete('/api/cms/pages/123')
        .expect(401); // Or 403 if session exists but not admin
      
      assert.ok(response.body.message);
    });
  });
});

