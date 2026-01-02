import pg from 'pg';
const { Pool } = pg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { env } from "./config";

/**
 * Parse query parameters from DATABASE_URL to extract SSL settings
 */
function parseQueryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) return {};

  const queryString = url.substring(queryIndex + 1);
  const params: Record<string, string> = {};
  for (const pair of queryString.split('&')) {
    const [key, value] = pair.split('=');
    if (key && value) {
      params[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return params;
}

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

  // Extract query params for SSL settings
  const queryParams = parseQueryParams(url);

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
      queryParams,
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
      queryParams,
    };
  }

  // If neither format matches, log warning and return null (will use connectionString fallback)
  console.warn('Could not parse DATABASE_URL with regex - falling back to connectionString');
  return null;
}

/**
 * Build SSL config from query params and environment
 */
function buildSslConfig(queryParams: Record<string, string> | undefined) {
  const sslmode = queryParams?.sslmode;

  // If sslmode is explicitly disabled, no SSL
  if (sslmode === 'disable') {
    return false;
  }

  // If sslmode is set to require/verify-ca/verify-full, or we're in production, enable SSL
  if (sslmode === 'require' || sslmode === 'verify-ca' || sslmode === 'verify-full' || env.NODE_ENV === 'production') {
    return { rejectUnauthorized: sslmode === 'verify-full' };
  }

  return false;
}

const dbConfig = parseDatabaseUrl(env.DATABASE_URL);

export const pool = new Pool(
  dbConfig ? {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    max: parseInt(env.DB_POOL_SIZE),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: buildSslConfig(dbConfig.queryParams),
  } : {
    connectionString: env.DATABASE_URL,
    max: parseInt(env.DB_POOL_SIZE),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: buildSslConfig(parseQueryParams(env.DATABASE_URL)),
  }
);

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});

export const db = drizzle({ client: pool, schema });