import "server-only";

import { randomBytes } from "node:crypto";
import { pool } from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertRule {
  id: string;
  name: string;
  description: string | null;
  entityType: string;
  metric: string;
  operator: "gt" | "lt" | "gte" | "lte" | "eq";
  threshold: number;
  severity: "warning" | "critical";
  durationSeconds: number;
  enabled: boolean;
  entityFilter: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  entityId: string;
  entityType: string;
  entityName: string;
  severity: string;
  metric: string;
  threshold: number;
  actualValue: number;
  message: string;
  status: "active" | "acknowledged" | "resolved";
  firedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface AlertCount {
  total: number;
  critical: number;
  warning: number;
}

// ---------------------------------------------------------------------------
// Schema initialization
// ---------------------------------------------------------------------------

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureAlertTables(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS alert_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          entity_type TEXT NOT NULL,
          metric TEXT NOT NULL,
          operator TEXT NOT NULL,
          threshold DOUBLE PRECISION NOT NULL,
          severity TEXT NOT NULL,
          duration_seconds INTEGER NOT NULL DEFAULT 0,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          entity_filter JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          rule_id TEXT NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
          entity_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_name TEXT NOT NULL,
          severity TEXT NOT NULL,
          metric TEXT NOT NULL,
          threshold DOUBLE PRECISION NOT NULL,
          actual_value DOUBLE PRECISION NOT NULL,
          message TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'active',
          fired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          acknowledged_at TIMESTAMPTZ,
          resolved_at TIMESTAMPTZ
        )
      `);
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_alerts_fired_at ON alerts(fired_at DESC)"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id)"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_alerts_rule_entity_status ON alerts(rule_id, entity_id, status)"
      );
      await pool.query(
        "CREATE INDEX IF NOT EXISTS idx_alerts_status_fired ON alerts(status, fired_at)"
      );
      initialized = true;
    })();
  }
  await initPromise;
}

// ---------------------------------------------------------------------------
// Alert Rules CRUD
// ---------------------------------------------------------------------------

function rowToRule(row: Record<string, unknown>): AlertRule {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    entityType: row.entity_type as string,
    metric: row.metric as string,
    operator: row.operator as AlertRule["operator"],
    threshold: row.threshold as number,
    severity: row.severity as AlertRule["severity"],
    durationSeconds: (row.duration_seconds as number) ?? 0,
    enabled: row.enabled as boolean,
    entityFilter: (row.entity_filter as Record<string, unknown>) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function listAlertRules(): Promise<AlertRule[]> {
  await ensureAlertTables();
  const result = await pool.query(
    "SELECT * FROM alert_rules ORDER BY created_at DESC"
  );
  return result.rows.map(rowToRule);
}

export async function getAlertRule(id: string): Promise<AlertRule | null> {
  await ensureAlertTables();
  const result = await pool.query("SELECT * FROM alert_rules WHERE id = $1", [
    id,
  ]);
  return result.rows[0] ? rowToRule(result.rows[0]) : null;
}

export async function createAlertRule(input: {
  name: string;
  description?: string;
  entityType: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: string;
  durationSeconds?: number;
  enabled?: boolean;
  entityFilter?: Record<string, unknown>;
}): Promise<AlertRule> {
  await ensureAlertTables();
  const id = `rule-${randomBytes(8).toString("hex")}`;
  const now = new Date();
  await pool.query(
    `INSERT INTO alert_rules (id, name, description, entity_type, metric, operator, threshold, severity, duration_seconds, enabled, entity_filter, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      id,
      input.name,
      input.description ?? null,
      input.entityType,
      input.metric,
      input.operator,
      input.threshold,
      input.severity,
      input.durationSeconds ?? 0,
      input.enabled ?? true,
      input.entityFilter ? JSON.stringify(input.entityFilter) : null,
      now,
      now,
    ]
  );
  return (await getAlertRule(id))!;
}

export async function updateAlertRule(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    entityType: string;
    metric: string;
    operator: string;
    threshold: number;
    severity: string;
    durationSeconds: number;
    enabled: boolean;
    entityFilter: Record<string, unknown>;
  }>
): Promise<AlertRule | null> {
  await ensureAlertTables();
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const map: Record<string, string> = {
    name: "name",
    description: "description",
    entityType: "entity_type",
    metric: "metric",
    operator: "operator",
    threshold: "threshold",
    severity: "severity",
    durationSeconds: "duration_seconds",
    enabled: "enabled",
    entityFilter: "entity_filter",
  };

  for (const [key, col] of Object.entries(map)) {
    if (key in patch) {
      const val =
        key === "entityFilter"
          ? JSON.stringify((patch as Record<string, unknown>)[key])
          : (patch as Record<string, unknown>)[key];
      fields.push(`${col} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return getAlertRule(id);

  fields.push(`updated_at = $${idx++}`);
  values.push(new Date());
  values.push(id);

  await pool.query(
    `UPDATE alert_rules SET ${fields.join(", ")} WHERE id = $${idx}`,
    values
  );
  return getAlertRule(id);
}

export async function deleteAlertRule(id: string): Promise<boolean> {
  await ensureAlertTables();
  const result = await pool.query("DELETE FROM alert_rules WHERE id = $1", [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Alerts CRUD
// ---------------------------------------------------------------------------

function rowToAlert(row: Record<string, unknown>): Alert {
  return {
    id: row.id as string,
    ruleId: row.rule_id as string,
    entityId: row.entity_id as string,
    entityType: row.entity_type as string,
    entityName: row.entity_name as string,
    severity: row.severity as string,
    metric: row.metric as string,
    threshold: row.threshold as number,
    actualValue: row.actual_value as number,
    message: row.message as string,
    status: row.status as Alert["status"],
    firedAt: (row.fired_at as Date).toISOString(),
    acknowledgedAt: row.acknowledged_at
      ? (row.acknowledged_at as Date).toISOString()
      : null,
    resolvedAt: row.resolved_at
      ? (row.resolved_at as Date).toISOString()
      : null,
  };
}

export async function listAlerts(filters?: {
  status?: string;
  severity?: string;
  entityType?: string;
  limit?: number;
  offset?: number;
}): Promise<Alert[]> {
  await ensureAlertTables();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters?.severity) {
    conditions.push(`severity = $${idx++}`);
    values.push(filters.severity);
  }
  if (filters?.entityType) {
    conditions.push(`entity_type = $${idx++}`);
    values.push(filters.entityType);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters?.limit ?? 100;
  const offset = filters?.offset ?? 0;

  const result = await pool.query(
    `SELECT * FROM alerts ${where} ORDER BY fired_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...values, limit, offset]
  );
  return result.rows.map(rowToAlert);
}

export async function countActiveAlerts(): Promise<AlertCount> {
  await ensureAlertTables();
  const result = await pool.query<{ severity: string; count: string }>(
    "SELECT severity, COUNT(*)::text AS count FROM alerts WHERE status = 'active' GROUP BY severity"
  );
  let critical = 0;
  let warning = 0;
  for (const row of result.rows) {
    if (row.severity === "critical") critical = Number(row.count);
    else if (row.severity === "warning") warning = Number(row.count);
  }
  return { total: critical + warning, critical, warning };
}

export async function acknowledgeAlert(id: string): Promise<Alert | null> {
  await ensureAlertTables();
  const result = await pool.query(
    "UPDATE alerts SET status = 'acknowledged', acknowledged_at = NOW() WHERE id = $1 AND status = 'active' RETURNING *",
    [id]
  );
  return result.rows[0] ? rowToAlert(result.rows[0]) : null;
}

export async function resolveAlert(id: string): Promise<Alert | null> {
  await ensureAlertTables();
  const result = await pool.query(
    "UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE id = $1 AND status IN ('active', 'acknowledged') RETURNING *",
    [id]
  );
  return result.rows[0] ? rowToAlert(result.rows[0]) : null;
}

export async function createAlert(input: {
  ruleId: string;
  entityId: string;
  entityType: string;
  entityName: string;
  severity: string;
  metric: string;
  threshold: number;
  actualValue: number;
  message: string;
}): Promise<Alert> {
  await ensureAlertTables();
  const id = `alert-${randomBytes(8).toString("hex")}`;
  await pool.query(
    `INSERT INTO alerts (id, rule_id, entity_id, entity_type, entity_name, severity, metric, threshold, actual_value, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.ruleId,
      input.entityId,
      input.entityType,
      input.entityName,
      input.severity,
      input.metric,
      input.threshold,
      input.actualValue,
      input.message,
    ]
  );
  const result = await pool.query("SELECT * FROM alerts WHERE id = $1", [id]);
  return rowToAlert(result.rows[0]);
}

export async function findActiveAlert(
  ruleId: string,
  entityId: string
): Promise<Alert | null> {
  await ensureAlertTables();
  const result = await pool.query(
    "SELECT * FROM alerts WHERE rule_id = $1 AND entity_id = $2 AND status IN ('active', 'acknowledged') LIMIT 1",
    [ruleId, entityId]
  );
  return result.rows[0] ? rowToAlert(result.rows[0]) : null;
}

export async function autoResolveAlert(
  ruleId: string,
  entityId: string
): Promise<void> {
  await ensureAlertTables();
  await pool.query(
    "UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE rule_id = $1 AND entity_id = $2 AND status IN ('active', 'acknowledged')",
    [ruleId, entityId]
  );
}

// ---------------------------------------------------------------------------
// Batch operations (for efficient alert evaluation at scale)
// ---------------------------------------------------------------------------

/**
 * Fetch all active/acknowledged alerts for a set of rule IDs in a single query.
 * Returns a Map keyed by "ruleId:entityId" for O(1) lookups.
 */
export async function batchFindActiveAlerts(
  ruleIds: string[]
): Promise<Map<string, Alert>> {
  await ensureAlertTables();
  if (ruleIds.length === 0) return new Map();

  const placeholders = ruleIds.map((_, i) => `$${i + 1}`).join(", ");
  const result = await pool.query(
    `SELECT * FROM alerts WHERE rule_id IN (${placeholders}) AND status IN ('active', 'acknowledged')`,
    ruleIds
  );

  const map = new Map<string, Alert>();
  for (const row of result.rows) {
    const alert = rowToAlert(row);
    map.set(`${alert.ruleId}:${alert.entityId}`, alert);
  }
  return map;
}

/**
 * Batch auto-resolve alerts for entities that are no longer triggering.
 * Takes an array of { ruleId, entityId } pairs.
 */
export async function batchAutoResolve(
  pairs: Array<{ ruleId: string; entityId: string }>
): Promise<number> {
  await ensureAlertTables();
  if (pairs.length === 0) return 0;

  // Use a single UPDATE with ANY() for efficiency
  const ruleIds = pairs.map((p) => p.ruleId);
  const entityIds = pairs.map((p) => p.entityId);
  // Build a VALUES list for exact pair matching
  const conditions = pairs
    .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
    .join(", ");
  const values = pairs.flatMap((p) => [p.ruleId, p.entityId]);

  const result = await pool.query(
    `UPDATE alerts SET status = 'resolved', resolved_at = NOW()
     WHERE (rule_id, entity_id) IN (${conditions})
       AND status IN ('active', 'acknowledged')`,
    values
  );
  return result.rowCount ?? 0;
}

/**
 * Batch insert multiple alerts in a single query.
 */
export async function batchCreateAlerts(
  inputs: Array<{
    ruleId: string;
    entityId: string;
    entityType: string;
    entityName: string;
    severity: string;
    metric: string;
    threshold: number;
    actualValue: number;
    message: string;
  }>
): Promise<number> {
  await ensureAlertTables();
  if (inputs.length === 0) return 0;

  const valueClauses: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const input of inputs) {
    const id = `alert-${randomBytes(8).toString("hex")}`;
    valueClauses.push(
      `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
    );
    params.push(
      id,
      input.ruleId,
      input.entityId,
      input.entityType,
      input.entityName,
      input.severity,
      input.metric,
      input.threshold,
      input.actualValue,
      input.message
    );
  }

  await pool.query(
    `INSERT INTO alerts (id, rule_id, entity_id, entity_type, entity_name, severity, metric, threshold, actual_value, message)
     VALUES ${valueClauses.join(", ")}`,
    params
  );
  return inputs.length;
}

// ---------------------------------------------------------------------------
// Retention / cleanup
// ---------------------------------------------------------------------------

const RETENTION_DAYS = 30;
let lastPurgeAt = 0;
const PURGE_INTERVAL_MS = 3600_000; // run at most once per hour

/**
 * Delete resolved alerts older than RETENTION_DAYS.
 * Call this periodically (e.g. from the alert evaluator).
 * Self-throttled to run at most once per hour.
 */
export async function purgeOldAlerts(): Promise<number> {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_INTERVAL_MS) return 0;
  lastPurgeAt = now;

  await ensureAlertTables();
  const result = await pool.query(
    `DELETE FROM alerts
     WHERE status = 'resolved'
       AND resolved_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`
  );
  const deleted = result.rowCount ?? 0;
  if (deleted > 0) {
    console.log(`[alerts-store] Purged ${deleted} resolved alerts older than ${RETENTION_DAYS} days`);
  }
  return deleted;
}
