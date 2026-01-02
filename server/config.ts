import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  
  // Database - optional with fallback (Railway env vars should override)
  DATABASE_URL: z.string().optional().default('postgresql://placeholder'),
  
  // Security - optional with fallback (Railway env vars should override)
  SESSION_SECRET: z.string().optional().default('placeholder-session-secret-please-set-in-railway'),
  
  // AI APIs - optional with fallback (Railway env vars should override)
  OPENAI_API_KEY: z.string().optional().default(''),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Email - optional with fallback (Railway env vars should override)
  BREVO_API_KEY: z.string().optional().default(''),
  
  // Object Storage (optional for local dev)
  PUBLIC_OBJECT_SEARCH_PATHS: z.string().optional(),
  PRIVATE_OBJECT_DIR: z.string().optional(),
  
  // Deployment
  FRONTEND_URL: z.string().url().optional(),
  
  // Database Pool
  DB_POOL_SIZE: z.string().default('10'),
  
  // Feature Flags
  HYBRID_SEARCH_ENABLED: z.enum(['true', 'false']).default('false'),
  RERANKING_ENABLED: z.enum(['true', 'false']).default('false'),
  
  // Observability (optional)
  LANGCHAIN_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  
  // Cohere (optional)
  COHERE_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('? Environment variable validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    console.error('\n?? Quick fix:');
    console.error('  1. Copy .env.example to .env (if it exists)');
    console.error('  2. Set SESSION_SECRET with: export SESSION_SECRET=$(openssl rand -base64 32)');
    console.error('  3. Ensure DATABASE_URL, OPENAI_API_KEY, and BREVO_API_KEY are set');
    process.exit(1);
  }
}

// Validate environment on module load
export const env = validateEnv();
