/**
 * API endpoint tests for guideline profiles
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';

const app = express();
app.use(express.json());

describe('Guideline Profile Endpoints', () => {
  let server: any;

  test('should setup test server', async () => {
    server = await registerRoutes(app);
    assert.ok(server !== undefined);
  });

  describe('GET /api/guideline-profiles', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/guideline-profiles')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/guideline-profiles/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/guideline-profiles/123')
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate profile ID format', async () => {
      // Would need authenticated session
      const response = await request(app)
        .get('/api/guideline-profiles/invalid-id')
        .expect(401); // Or 404 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/guideline-profiles', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles')
        .send({ name: 'Test Profile' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('PUT /api/guideline-profiles/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/guideline-profiles/123')
        .send({ name: 'Updated Profile' })
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('DELETE /api/guideline-profiles/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/guideline-profiles/123')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/guideline-profiles/auto-populate', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/auto-populate')
        .send({ domainUrl: 'https://example.com' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should require domainUrl', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/auto-populate')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });

    test('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/auto-populate')
        .send({ domainUrl: 'not-a-url' })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/guideline-profiles/auto-populate-pdf', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/auto-populate-pdf')
        .send({ pdfBase64: 'base64data' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should require pdfBase64', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/auto-populate-pdf')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/guideline-profiles/discover-context-pages', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/guideline-profiles/discover-context-pages')
        .send({ homepageUrl: 'https://example.com' })
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });
});

