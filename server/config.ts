import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  
  // Database (optional with fallback for Railway setup)
  DATABASE_URL: z.string().url().optional().default('postgresql://dummy:dummy@localhost:5432/dummy'),
  
  // Security (auto-generate if missing in production)
  SESSION_SECRET: z.string().min(1).default('please-set-a-real-session-secret-in-production'),
  
  // AI APIs (optional with fallback)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(), // Optional if using OpenAI only
  
  // Email (optional with fallback)
  SENDGRID_API_KEY: z.string().optional(),
  
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
    const parsed = envSchema.parse(process.env);
    
    // Warn about missing critical variables in production
    if (parsed.NODE_ENV === 'production') {
      const warnings: string[] = [];
      if (!process.env.DATABASE_URL) warnings.push('DATABASE_URL not set - using fallback');
      if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'please-set-a-real-session-secret-in-production') {
        warnings.push('SESSION_SECRET not set - INSECURE!');
      }
      if (!process.env.OPENAI_API_KEY) warnings.push('OPENAI_API_KEY not set - AI features disabled');
      if (!process.env.SENDGRID_API_KEY) warnings.push('SENDGRID_API_KEY not set - email disabled');
      
      if (warnings.length > 0) {
        console.warn('\n⚠️  Production environment warnings:');
        warnings.forEach(w => console.warn(`  - ${w}`));
        console.warn('\n💡 Set these variables in Railway for full functionality\n');
      }
    }
    
    return parsed;
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
