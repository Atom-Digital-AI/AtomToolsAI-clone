import { describe, it, expect } from 'vitest';
import {
  createGeneratedContentSchema,
  contentFeedbackSchema,
  langgraphStartSchema,
  threadIdParamsSchema,
} from '../content.schema';

describe('content.schema', () => {
  describe('createGeneratedContentSchema', () => {
    it('accepts valid generated content data', () => {
      const validData = {
        toolType: 'content-writer',
        title: 'Test Article',
        inputData: { topic: 'Test Topic' },
        outputData: { content: 'Generated content' },
      };
      const result = createGeneratedContentSchema.parse(validData);
      expect(result.toolType).toBe('content-writer');
      expect(result.title).toBe('Test Article');
    });

    it('rejects missing required fields', () => {
      expect(() => createGeneratedContentSchema.parse({})).toThrow();
      expect(() => createGeneratedContentSchema.parse({ toolType: 'test' })).toThrow();
    });

    it('rejects empty inputData', () => {
      const invalidData = {
        toolType: 'content-writer',
        title: 'Test',
        inputData: {},
        outputData: { content: 'test' },
      };
      expect(() => createGeneratedContentSchema.parse(invalidData)).toThrow();
    });
  });

  describe('contentFeedbackSchema', () => {
    it('accepts valid feedback data', () => {
      const validData = {
        toolType: 'content-writer',
        rating: 5,
        inputData: { topic: 'Test' },
        outputData: { content: 'Test' },
      };
      const result = contentFeedbackSchema.parse(validData);
      expect(result.rating).toBe(5);
    });

    it('rejects invalid rating values', () => {
      const invalidData = {
        toolType: 'test',
        rating: 0,
        inputData: {},
        outputData: {},
      };
      expect(() => contentFeedbackSchema.parse(invalidData)).toThrow();
    });

    it('accepts rating from 1 to 5', () => {
      for (let rating = 1; rating <= 5; rating++) {
        const data = {
          toolType: 'test',
          rating,
          inputData: {},
          outputData: {},
        };
        expect(() => contentFeedbackSchema.parse(data)).not.toThrow();
      }
    });
  });

  describe('langgraphStartSchema', () => {
    it('accepts valid start request', () => {
      const validData = {
        topic: 'How to write better code',
      };
      const result = langgraphStartSchema.parse(validData);
      expect(result.topic).toBe('How to write better code');
    });

    it('rejects empty topic', () => {
      expect(() => langgraphStartSchema.parse({ topic: '' })).toThrow();
    });

    it('accepts optional parameters', () => {
      const validData = {
        topic: 'Test Topic',
        guidelineProfileId: '123e4567-e89b-12d3-a456-426614174000',
        objective: 'Increase traffic',
        targetLength: 1500,
        toneOfVoice: 'professional',
        language: 'en',
        useBrandGuidelines: true,
        styleMatchingMethod: 'continuous' as const,
      };
      const result = langgraphStartSchema.parse(validData);
      expect(result.guidelineProfileId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.styleMatchingMethod).toBe('continuous');
    });
  });

  describe('threadIdParamsSchema', () => {
    it('accepts valid thread ID', () => {
      const result = threadIdParamsSchema.parse({ threadId: 'thread-123' });
      expect(result.threadId).toBe('thread-123');
    });

    it('rejects empty thread ID', () => {
      expect(() => threadIdParamsSchema.parse({ threadId: '' })).toThrow();
    });
  });
});
