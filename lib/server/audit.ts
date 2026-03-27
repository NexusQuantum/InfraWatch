import "server-only";

import { pool } from "./db";

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureAuditTable(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id SERIAL PRIMARY KEY,
          action TEXT NOT NULL,
          target_id TEXT,
          target_name TEXT,
          detail JSONB,
          ip_address TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      initialized = true;
    })();
  }
  await initPromise;
}

export async function logAudit(
  action: string,
  opts: {
    targetId?: string;
    targetName?: string;
    detail?: Record<string, unknown>;
    ip?: string;
  } = {}
): Promise<void> {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO audit_log (action, target_id, target_name, detail, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        action,
        opts.targetId ?? null,
        opts.targetName ?? null,
        opts.detail ? JSON.stringify(opts.detail) : null,
        opts.ip ?? null,
      ]
    );
  } catch (error) {
    console.error("[audit] Failed to write audit log:", error);
  }
}
