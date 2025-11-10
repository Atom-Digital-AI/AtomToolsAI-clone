/**
 * Tests for logger.ts
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import { logger } from '../logger';

describe('logger', () => {
  test('should have error method', () => {
    assert.ok(typeof logger.error === 'function');
  });

  test('should have warn method', () => {
    assert.ok(typeof logger.warn === 'function');
  });

  test('should have info method', () => {
    assert.ok(typeof logger.info === 'function');
  });

  test('should have debug method', () => {
    assert.ok(typeof logger.debug === 'function');
  });

  test('should log error messages', () => {
    // Capture console.error
    const originalError = console.error;
    let loggedMessage = '';
    console.error = (...args: any[]) => {
      loggedMessage = args.join(' ');
    };

    logger.error('Test error');
    assert.ok(loggedMessage.includes('Test error') || loggedMessage.includes('[ERROR]'));

    console.error = originalError;
  });

  test('should log info messages', () => {
    // Capture console.log
    const originalLog = console.log;
    let loggedMessage = '';
    console.log = (...args: any[]) => {
      loggedMessage = args.join(' ');
    };

    logger.info('Test info');
    assert.ok(loggedMessage.includes('Test info') || loggedMessage.includes('[INFO]'));

    console.log = originalLog;
  });

  test('should log warn messages', () => {
    // Capture console.warn
    const originalWarn = console.warn;
    let loggedMessage = '';
    console.warn = (...args: any[]) => {
      loggedMessage = args.join(' ');
    };

    logger.warn('Test warning');
    assert.ok(loggedMessage.includes('Test warning') || loggedMessage.includes('[WARN]'));

    console.warn = originalWarn;
  });
});

