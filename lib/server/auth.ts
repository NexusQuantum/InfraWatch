import "server-only";

import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "./db";

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureAuthTables(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_user (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS login_attempts (
          id SERIAL PRIMARY KEY,
          ip_address TEXT NOT NULL,
          attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
        ON login_attempts(ip_address, attempted_at)
      `);
      initialized = true;
    })();
  }
  await initPromise;
}

// ---------------------------------------------------------------------------
// Password hashing using scrypt (no external deps, works in Bun)
// ---------------------------------------------------------------------------

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(plain, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (derived.length !== storedBuf.length) return false;
  return timingSafeEqual(derived, storedBuf);
}

// ---------------------------------------------------------------------------
// Admin user management
// ---------------------------------------------------------------------------

export async function ensureAdminUser(): Promise<void> {
  await ensureAuthTables();
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM admin_user"
  );
  const count = Number(result.rows[0]?.count ?? "0");
  if (count > 0) return;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      "[auth] No ADMIN_PASSWORD set. Creating default admin user with password 'admin'. Change this immediately in production."
    );
  }
  const hashed = hashPassword(password || "admin");
  await pool.query(
    "INSERT INTO admin_user (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING",
    [username, hashed]
  );
}

export async function validateCredentials(
  username: string,
  password: string
): Promise<boolean> {
  await ensureAuthTables();
  const result = await pool.query<{ password_hash: string }>(
    "SELECT password_hash FROM admin_user WHERE username = $1",
    [username]
  );
  const row = result.rows[0];
  if (!row) return false;
  return verifyPassword(password, row.password_hash);
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSession(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  await ensureAuthTables();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await pool.query(
    "INSERT INTO sessions (token, expires_at) VALUES ($1, $2)",
    [token, expiresAt.toISOString()]
  );
  return { token, expiresAt };
}

export async function validateSession(token: string): Promise<boolean> {
  await ensureAuthTables();
  const result = await pool.query<{ expires_at: Date }>(
    "SELECT expires_at FROM sessions WHERE token = $1",
    [token]
  );
  const row = result.rows[0];
  if (!row) return false;
  if (new Date(row.expires_at) < new Date()) {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
    return false;
  }
  return true;
}

export async function destroySession(token: string): Promise<void> {
  await ensureAuthTables();
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export async function cleanExpiredSessions(): Promise<void> {
  await ensureAuthTables();
  await pool.query("DELETE FROM sessions WHERE expires_at < NOW()");
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

export async function checkRateLimit(ip: string): Promise<boolean> {
  await ensureAuthTables();
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM login_attempts WHERE ip_address = $1 AND attempted_at > NOW() - INTERVAL '15 minutes'",
    [ip]
  );
  return Number(result.rows[0]?.count ?? "0") < 5;
}

export async function recordLoginAttempt(ip: string): Promise<void> {
  await ensureAuthTables();
  await pool.query(
    "INSERT INTO login_attempts (ip_address) VALUES ($1)",
    [ip]
  );
}

// ---------------------------------------------------------------------------
// CSRF token
// ---------------------------------------------------------------------------

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex");
}
