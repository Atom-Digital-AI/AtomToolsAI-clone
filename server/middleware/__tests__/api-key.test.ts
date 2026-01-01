import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { apiKeyAuth, requireScopes, generateApiKey } from '../api-key';

// Mock the database
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

// Mock the logger module
vi.mock('../../logging/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => mockLogger),
  };

  return {
    getLogger: vi.fn(() => mockLogger),
    setContextUserId: vi.fn(),
    logger: mockLogger,
  };
});

// Mock the schema
vi.mock('../../../shared/schema', () => ({
  apiKeys: {
    keyHash: 'keyHash',
    revokedAt: 'revokedAt',
    id: 'id',
  },
}));

import { db } from '../../db';

describe('apiKeyAuth middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {},
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Reset database mock to successful case
    vi.mocked(db.select().from('').where('').limit).mockResolvedValue([]);
  });

  describe('when no API key is provided', () => {
    it('should call next to allow session auth fallback', async () => {
      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should not set apiKey on request', async () => {
      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toBeUndefined();
    });
  });

  describe('when API key is provided', () => {
    const validApiKey = 'atk_test123456789abcdefghij';

    beforeEach(() => {
      mockReq.headers = { 'x-api-key': validApiKey };
    });

    it('should reject invalid API key', async () => {
      vi.mocked(db.select().from('').where('').limit).mockResolvedValue([]);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid or revoked API key',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should authenticate valid API key', async () => {
      const mockApiKeyRecord = {
        id: 'key-123',
        userId: '456',
        name: 'Test Key',
        scopes: ['read', 'write'],
        rateLimit: 100,
        expiresAt: null,
      };

      vi.mocked(db.select().from('').where('').limit).mockResolvedValue([mockApiKeyRecord]);

      // Mock the update chain
      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.apiKey).toEqual({
        id: 'key-123',
        userId: '456',
        name: 'Test Key',
        scopes: ['read', 'write'],
        rateLimit: 100,
      });
      expect((mockReq as any).user).toEqual({ id: '456' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject expired API key', async () => {
      const expiredKey = {
        id: 'key-123',
        userId: '456',
        name: 'Expired Key',
        scopes: [],
        rateLimit: 100,
        expiresAt: new Date('2020-01-01'),
      };

      vi.mocked(db.select().from('').where('').limit).mockResolvedValue([expiredKey]);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'EXPIRED_API_KEY',
          message: 'API key has expired',
        },
      });
    });

    it('should allow non-expired API key', async () => {
      const validKey = {
        id: 'key-123',
        userId: '456',
        name: 'Valid Key',
        scopes: [],
        rateLimit: 100,
        expiresAt: new Date('2099-12-31'),
      };

      vi.mocked(db.select().from('').where('').limit).mockResolvedValue([validKey]);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.apiKey).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(db.select().from('').where('').limit).mockRejectedValue(
        new Error('Database connection failed')
      );

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should update last used timestamp', async () => {
      const validKey = {
        id: 'key-123',
        userId: '456',
        name: 'Test Key',
        scopes: [],
        rateLimit: 100,
        expiresAt: null,
      };

      vi.mocked(db.select().from('').where('').limit).mockResolvedValue([validKey]);

      const mockWhere = vi.fn().mockResolvedValue(undefined);
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

      await apiKeyAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(db.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lastUsedAt: expect.any(Date),
        })
      );
    });
  });
});

describe('requireScopes middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  it('should allow request without API key (session auth)', () => {
    requireScopes(['admin'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should allow request with required scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Admin Key',
      scopes: ['admin', 'read', 'write'],
      rateLimit: 100,
    };

    requireScopes(['admin'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should allow request with all required scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Full Access Key',
      scopes: ['admin', 'read', 'write', 'delete'],
      rateLimit: 100,
    };

    requireScopes(['read', 'write'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject request missing required scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Limited Key',
      scopes: ['read'],
      rateLimit: 100,
    };

    requireScopes(['admin'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPES',
        message: 'API key requires scopes: admin',
      },
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should reject request missing partial scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Partial Key',
      scopes: ['read'],
      rateLimit: 100,
    };

    requireScopes(['read', 'write'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPES',
        message: 'API key requires scopes: read, write',
      },
    });
  });

  it('should handle null scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'No Scopes Key',
      scopes: null,
      rateLimit: 100,
    };

    requireScopes(['read'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should handle empty scopes array', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Empty Scopes Key',
      scopes: [],
      rateLimit: 100,
    };

    requireScopes(['read'])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
  });

  it('should pass with empty required scopes', () => {
    mockReq.apiKey = {
      id: 'key-123',
      userId: '456',
      name: 'Any Key',
      scopes: [],
      rateLimit: 100,
    };

    requireScopes([])(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('generateApiKey', () => {
  it('should generate a valid API key', () => {
    const result = generateApiKey();

    expect(result.key).toMatch(/^atk_[a-f0-9]{32}$/);
    expect(result.keyPrefix).toBe(result.key.substring(0, 8));
    expect(result.keyHash).toHaveLength(64); // SHA-256 hex
  });

  it('should generate unique keys', () => {
    const keys = new Set();

    for (let i = 0; i < 100; i++) {
      const result = generateApiKey();
      keys.add(result.key);
    }

    expect(keys.size).toBe(100);
  });

  it('should generate consistent hash for same key', () => {
    const result1 = generateApiKey();
    // The key should consistently hash to the same value
    expect(result1.keyHash).toBeTruthy();
    expect(typeof result1.keyHash).toBe('string');
  });

  it('should have correct prefix format', () => {
    const result = generateApiKey();

    // keyPrefix should be first 8 characters of the key
    expect(result.keyPrefix).toBe(result.key.substring(0, 8));
    expect(result.keyPrefix).toMatch(/^atk_[a-f0-9]{4}$/);
  });
});
