import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from "./config";

/**
 * Parse DATABASE_URL manually to handle special characters in passwords.
 * This bypasses URL encoding issues by extracting components directly.
 */
function parseDatabaseUrl(url: string) {
  if (!url || url === 'postgresql://placeholder') {
    console.warn('DATABASE_URL is placeholder - database connection will fail');
    return null;
  }
  
  // Extract components WITHOUT encoding/decoding
  // Format: postgresql://user:password@host:port/database
  const match = url.match(/^postgresql?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+?)(?:\?.*)?$/);
  
  if (!match) {
    console.error('Could not parse DATABASE_URL - invalid format');
    return null;
  }
  
  const [, user, password, host, port, database] = match;
  
  // Basic validation
  if (!host || !port || !user || !password) {
    console.error('Missing required connection parameters in DATABASE_URL');
    return null;
  }
  
  console.log(`Parsed DATABASE_URL: ${user}@${host}:${port}/${database.split('?')[0]}`);
  
  return {
    host,
    port: parseInt(port),
    user,
    password, // Raw password, no encoding needed!
    database: database.split('?')[0], // Remove query params
  };
}

const dbConfig = parseDatabaseUrl(env.DATABASE_URL);

export const pool = new Pool(
  dbConfig ? {
    ...dbConfig,
    max: parseInt(env.DB_POOL_SIZE),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  } : {
    connectionString: env.DATABASE_URL,
    max: parseInt(env.DB_POOL_SIZE),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }
);

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

export const db = drizzle({ client: pool, schema });