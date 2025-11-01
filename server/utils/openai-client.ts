/**
 * Shared OpenAI client with lazy initialization
 * Prevents crashes when OPENAI_API_KEY is not available at module load time
 */

import OpenAI from 'openai';
import { env } from '../config';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === '') {
      throw new Error('OPENAI_API_KEY is required but not set. Please configure it in Railway.');
    }
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

// For backwards compatibility, export a getter that returns the client
export const openai = new Proxy({} as OpenAI, {
  get(target, prop) {
    return (getOpenAIClient() as any)[prop];
  }
});

