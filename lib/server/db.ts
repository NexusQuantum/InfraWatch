import "server-only";

import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

let schemaReady = false;
let schemaPromise: Promise<void> | null = null;

export async function ensureLicenseTable(): Promise<void> {
  if (schemaReady) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS license (
          id SERIAL PRIMARY KEY,
          license_key TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'unknown',
          customer_name TEXT,
          product TEXT,
          product_id TEXT,
          customer_id TEXT,
          features TEXT,
          expires_at TEXT,
          verified_at TEXT,
          activations INTEGER,
          max_activations INTEGER,
          cached_response TEXT,
          device_id TEXT,
          is_offline BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      schemaReady = true;
    })();
  }
  await schemaPromise;
}

export async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
