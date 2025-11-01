import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  
  // Database - required but will use passthrough to let Railway env vars work
  DATABASE_URL: z.string().min(1),
  
  // Security - required but will validate at runtime
  SESSION_SECRET: z.string().min(1),
  
  // AI APIs - required but will validate at runtime
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // Email - required but will validate at runtime
  SENDGRID_API_KEY: z.string().min(1),
  
  // Object Storage (optional for local dev)
  PUBLIC_OBJECT_SEARCH_PATHS: z.string().optional(),
  PRIVATE_OBJECT_DIR: z.string().optional(),
  
  // Deployment
  FRONTEND_URL: z.string().url().optional(),
  REPLIT_DOMAIN: z.string().optional(),
  
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
    console.error('  3. Ensure DATABASE_URL, OPENAI_API_KEY, and SENDGRID_API_KEY are set');
    process.exit(1);
  }
}

// Validate environment on module load
export const env = validateEnv();
