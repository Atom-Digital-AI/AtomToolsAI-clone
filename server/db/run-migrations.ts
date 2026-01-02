import { pool } from "../db";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all pending SQL migrations on application startup.
 *
 * Migrations are stored in server/db/migrations/*.sql and are executed
 * in alphabetical order. A schema_migrations table tracks which migrations
 * have already been applied.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = join(__dirname, "migrations");
    let migrationFiles: string[];

    try {
      const files = await readdir(migrationsDir);
      migrationFiles = files
        .filter(f => f.endsWith(".sql"))
        .sort(); // Sort alphabetically to ensure order
    } catch (error) {
      console.log("No migrations directory found, skipping migrations");
      return;
    }

    if (migrationFiles.length === 0) {
      console.log("No migration files found");
      return;
    }

    // Get already applied migrations
    const result = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );
    const appliedMigrations = new Set(result.rows.map(r => r.filename));

    // Apply pending migrations
    for (const filename of migrationFiles) {
      if (appliedMigrations.has(filename)) {
        continue;
      }

      console.log(`Applying migration: ${filename}`);

      const filePath = join(migrationsDir, filename);
      const sql = await readFile(filePath, "utf-8");

      // Run migration in a transaction
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename]
        );
        await client.query("COMMIT");
        console.log(`Migration applied: ${filename}`);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Failed to apply migration ${filename}:`, error);
        throw error;
      }
    }

    console.log("All migrations applied successfully");
  } finally {
    client.release();
  }
}
