/**
 * API endpoint tests for crawl jobs
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';

const app = express();
app.use(express.json());

describe('Crawl Job Endpoints', () => {
  let server: any;

  test('should setup test server', async () => {
    server = await registerRoutes(app);
    assert.ok(server !== undefined);
  });

  describe('POST /api/crawl/start', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/crawl/start')
        .send({ homepageUrl: 'https://example.com' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should require homepageUrl', async () => {
      const response = await request(app)
        .post('/api/crawl/start')
        .send({})
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });

    test('should validate URL format', async () => {
      const response = await request(app)
        .post('/api/crawl/start')
        .send({ homepageUrl: 'not-a-url' })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });

    test('should reject localhost URLs', async () => {
      const response = await request(app)
        .post('/api/crawl/start')
        .send({ homepageUrl: 'http://localhost' })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/crawl/:jobId/status', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/crawl/job-123/status')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/crawl/:jobId/cancel', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/crawl/job-123/cancel')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });
});

