import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from "./config";

/**
 * Parse DATABASE_URL manually to handle special characters in passwords.
 * This bypasses URL encoding issues by extracting components directly.
 * Supports: postgresql:// and postgres:// with optional port
 */
function parseDatabaseUrl(url: string) {
  if (!url || url === 'postgresql://placeholder') {
    console.warn('DATABASE_URL is placeholder - database connection will fail');
    return null;
  }

  // Try format with explicit port first: postgres(ql)://user:password@host:port/database
  let match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+):(\d+)\/([^?]+)(?:\?.*)?$/);

  if (match) {
    const [, user, password, host, port, database] = match;
    const decodedPassword = decodeURIComponent(password);
    console.log(`Parsed DATABASE_URL: ${user}@${host}:${port}/${database}`);
    return {
      host,
      port: parseInt(port),
      user,
      password: decodedPassword,
      database,
    };
  }

  // Try format without port: postgres(ql)://user:password@host/database (default port 5432)
  match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)(?:\?.*)?$/);

  if (match) {
    const [, user, password, host, database] = match;
    const decodedPassword = decodeURIComponent(password);
    console.log(`Parsed DATABASE_URL: ${user}@${host}:5432/${database} (default port)`);
    return {
      host,
      port: 5432,
      user,
      password: decodedPassword,
      database,
    };
  }

  // If neither format matches, log warning and return null (will use connectionString fallback)
  console.warn('Could not parse DATABASE_URL with regex - falling back to connectionString');
  return null;
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