import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from "./config";

export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  max: parseInt(env.DB_POOL_SIZE),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

export const db = drizzle({ client: pool, schema });