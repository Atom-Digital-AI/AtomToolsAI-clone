import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { env } from "./config";

neonConfig.webSocketConstructor = ws;

export const pool = new Pool({ 
  connectionString: env.DATABASE_URL,
  max: parseInt(env.DB_POOL_SIZE),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

export const db = drizzle({ client: pool, schema });