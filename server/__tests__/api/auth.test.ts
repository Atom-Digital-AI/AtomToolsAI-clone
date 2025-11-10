/**
 * API endpoint tests for authentication routes
 * Uses Supertest for HTTP testing
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../../routes';

// Create test app
const app = express();
app.use(express.json());

describe('Authentication Endpoints', () => {
  let server: any;

  test('should setup test server', async () => {
    server = await registerRoutes(app);
    assert.ok(server !== undefined);
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      assert.ok(response.body.status);
      assert.ok('timestamp' in response.body);
    });
  });

  describe('GET /health/live', () => {
    test('should return liveness status', async () => {
      const response = await request(app)
        .get('/health/live')
        .expect(200);
      
      assert.strictEqual(response.body.status, 'ok');
      assert.ok('timestamp' in response.body);
    });
  });

  describe('POST /api/auth/signup', () => {
    test('should reject signup without email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ password: 'password123' })
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject signup without password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' })
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: '123' })
        .expect(400);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid', password: 'password' })
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);
      
      assert.ok(response.body.message || response.body.success !== undefined);
    });
  });

  describe('GET /api/auth/verify-email', () => {
    test('should require token parameter', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email')
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-email?token=invalid-token')
        .expect(400);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    test('should require email', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({})
        .expect(400);
      
      assert.ok(response.body.message);
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email: 'invalid-email' })
        .expect(400);
      
      assert.ok(response.body.message);
    });
  });

  describe('PUT /api/auth/profile', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ name: 'Test User' })
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });

  describe('POST /api/auth/change-password', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'old', newPassword: 'new' })
        .expect(401);
      
      assert.ok(response.body.message);
    });

    test('should require current password', async () => {
      // This would need authenticated session
      const response = await request(app)
        .post('/api/auth/change-password')
        .send({ newPassword: 'newpassword' })
        .expect(401); // Or 400 if authenticated
      
      assert.ok(response.body.message);
    });
  });

  describe('DELETE /api/auth/account', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/auth/account')
        .expect(401);
      
      assert.ok(response.body.message);
    });
  });
});

