import "server-only";

import { randomBytes } from "node:crypto";
import { encryptString, decryptString } from "./encryption";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AuthMode, ConnectorStatus, ConnectorType, ConnectorTypeMeta } from "@/lib/types";
import { queryInstantWithConfig, type PrometheusConnectorConfig } from "@/lib/prometheus/client";
import { pool } from "./db";

const LEGACY_STORE_DIR = path.join(process.cwd(), ".data");
const LEGACY_STORE_PATH = path.join(LEGACY_STORE_DIR, "connectors.json");

const VALID_CONNECTOR_TYPES = new Set<ConnectorType>([
  "nqrust_hypervisor",
  "generic_prometheus",
  "kubernetes_cluster",
]);

type SecretPayload =
  | { authMode: "none" }
  | { authMode: "bearer"; bearerToken: string }
  | { authMode: "basic"; username: string; password: string };

interface StoredConnector {
  id: string;
  name: string;
  connectorType: ConnectorType;
  baseUrl: string;
  environment: string;
  site: string;
  datacenter: string;
  enabled: boolean;
  authMode: AuthMode;
  insecureTls: boolean;
  notes?: string;
  secretEnc: string;
  createdAt: string;
  updatedAt: string;
}

interface LegacyConnectorsStoreFile {
  version?: number;
  connectors?: Array<StoredConnector & { connectorType?: string }>;
}

interface ConnectorDbRow {
  id: string;
  name: string;
  connector_type: string;
  base_url: string;
  environment: string;
  site: string;
  datacenter: string;
  enabled: boolean;
  auth_mode: AuthMode;
  insecure_tls: boolean;
  notes: string | null;
  secret_enc: string;
  created_at: Date;
  updated_at: Date;
}

export interface ConnectorPublicRecord {
  id: string;
  name: string;
  connectorType: ConnectorType;
  typeMeta: ConnectorTypeMeta;
  baseUrl: string;
  environment: string;
  site: string;
  datacenter: string;
  enabled: boolean;
  authMode: AuthMode;
  insecureTls: boolean;
  notes?: string;
  status: ConnectorStatus;
  lastCheckedAt: string;
  latencyMs: number;
  healthNotes?: string[];
}

export interface ConnectorCreateInput {
  name: string;
  connectorType: ConnectorType;
  baseUrl: string;
  environment: string;
  site: string;
  datacenter: string;
  authMode: AuthMode;
  insecureTls?: boolean;
  notes?: string;
  enabled?: boolean;
  bearerToken?: string;
  username?: string;
  password?: string;
}

export interface ConnectorUpdateInput {
  name?: string;
  connectorType?: ConnectorType;
  baseUrl?: string;
  environment?: string;
  site?: string;
  datacenter?: string;
  authMode?: AuthMode;
  insecureTls?: boolean;
  notes?: string;
  enabled?: boolean;
  bearerToken?: string;
  username?: string;
  password?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// Encryption key is now managed by lib/server/encryption.ts

function looksLikeHypervisorUrl(baseUrl: string): boolean {
  return /(cattle-monitoring-system|rancher-monitoring-prometheus|harvester|nqrust-hypervisor)/i.test(baseUrl);
}

function normalizeConnectorType(raw: string | undefined, id: string, baseUrl: string): ConnectorType {
  if (raw === "nqrust_hypervisor" || raw === "generic_prometheus" || raw === "kubernetes_cluster") {
    return raw;
  }
  if (id === "env-default" && looksLikeHypervisorUrl(baseUrl)) {
    return "nqrust_hypervisor";
  }
  return "generic_prometheus";
}

function connectorTypeMeta(connectorType: ConnectorType): ConnectorTypeMeta {
  if (connectorType === "nqrust_hypervisor") {
    return {
      key: connectorType,
      label: "NQRust-Hypervisor",
      iconKey: "server",
      expectedCapabilities: ["hostMetrics", "clusterMetrics", "storageMetrics", "kubernetesMetrics"],
      quickFixTips: [
        "Use Rancher monitoring Prometheus proxy URL for the hypervisor cluster.",
        "Use bearer token auth and verify monitoring namespace access.",
        "Confirm node-exporter, kube-state-metrics, and Longhorn metrics are present.",
      ],
    };
  }
  if (connectorType === "kubernetes_cluster") {
    return {
      key: connectorType,
      label: "Kubernetes Cluster",
      iconKey: "container",
      expectedCapabilities: ["kubernetesMetrics", "clusterMetrics"],
      quickFixTips: [
        "Ensure kube-state-metrics and node metrics are scraped by Prometheus.",
        "Validate access to kube-system and workload namespaces.",
        "If storage metrics are needed, enable Longhorn/CSI exporter integration.",
      ],
    };
  }
  return {
    key: connectorType,
    label: "Generic Prometheus",
    iconKey: "activity",
    expectedCapabilities: [],
    quickFixTips: [
      "Use a valid Prometheus base URL with /api/v1 query support.",
      "Verify auth credentials and TLS settings for this endpoint.",
    ],
  };
}

function encryptSecret(payload: SecretPayload): string {
  return encryptString(JSON.stringify(payload));
}

function decryptSecret(ciphertext: string): SecretPayload {
  return JSON.parse(decryptString(ciphertext)) as SecretPayload;
}

function buildSecretPayload(input: ConnectorCreateInput | ConnectorUpdateInput, authMode: AuthMode): SecretPayload {
  if (authMode === "none") return { authMode: "none" };
  if (authMode === "bearer") {
    if (!input.bearerToken) throw new Error("Bearer token is required for bearer auth mode");
    return { authMode: "bearer", bearerToken: input.bearerToken };
  }
  if (!input.username || !input.password) {
    throw new Error("Username and password are required for basic auth mode");
  }
  return { authMode: "basic", username: input.username, password: input.password };
}

function makeConnectorConfig(connector: StoredConnector, secret: SecretPayload): PrometheusConnectorConfig {
  if (secret.authMode === "bearer") {
    return {
      baseUrl: connector.baseUrl,
      authMode: "bearer",
      bearerToken: secret.bearerToken,
      insecureTls: connector.insecureTls,
    };
  }
  if (secret.authMode === "basic") {
    return {
      baseUrl: connector.baseUrl,
      authMode: "basic",
      basicUser: secret.username,
      basicPass: secret.password,
      insecureTls: connector.insecureTls,
    };
  }
  return {
    baseUrl: connector.baseUrl,
    authMode: "none",
    insecureTls: connector.insecureTls,
  };
}

function mapStatus(success: boolean): ConnectorStatus {
  return success ? "healthy" : "down";
}

async function runTypeSoftChecks(config: PrometheusConnectorConfig, connectorType: ConnectorType): Promise<string[]> {
  const warnings: string[] = [];
  if (connectorType === "generic_prometheus") {
    return warnings;
  }

  const checks: Array<{ label: string; query: string; required: boolean }> =
    connectorType === "nqrust_hypervisor"
      ? [
          { label: "Host metrics", query: "count(node_uname_info)", required: true },
          { label: "Storage metrics (Longhorn)", query: "count(longhorn_volume_actual_size_bytes)", required: true },
          { label: "Kubernetes metrics", query: "count(kube_pod_info)", required: true },
        ]
      : [
          { label: "Kubernetes node metrics", query: "count(kube_node_info)", required: true },
          { label: "Kubernetes pod metrics", query: "count(kube_pod_info)", required: true },
          { label: "Storage metrics (optional)", query: "count(longhorn_volume_actual_size_bytes)", required: false },
        ];

  const results = await Promise.allSettled(
    checks.map(async (check) => {
      const response = await queryInstantWithConfig(config, check.query);
      const value = Number(response.result[0]?.value?.[1] ?? "0");
      return { check, ok: Number.isFinite(value) && value > 0 };
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled") {
      warnings.push("Failed one or more type-aware metric checks.");
      continue;
    }
    if (!result.value.ok && result.value.check.required) {
      warnings.push(`${result.value.check.label} missing.`);
    }
  }

  return Array.from(new Set(warnings));
}

async function probeConnector(
  connector: StoredConnector
): Promise<{ status: ConnectorStatus; lastCheckedAt: string; latencyMs: number; healthNotes?: string[] }> {
  const lastCheckedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const secret = decryptSecret(connector.secretEnc);
    const config = makeConnectorConfig(connector, secret);
    await queryInstantWithConfig(config, "sum(up)");
    const warnings = await runTypeSoftChecks(config, connector.connectorType);
    return {
      status: warnings.length > 0 ? "degraded" : mapStatus(true),
      lastCheckedAt,
      latencyMs: Date.now() - started,
      healthNotes: warnings.length ? warnings : undefined,
    };
  } catch {
    return {
      status: mapStatus(false),
      lastCheckedAt,
      latencyMs: Date.now() - started,
      healthNotes: ["Core connectivity check failed (sum(up))."],
    };
  }
}

function fromDbRow(row: ConnectorDbRow): StoredConnector {
  return {
    id: row.id,
    name: row.name,
    connectorType: normalizeConnectorType(row.connector_type, row.id, row.base_url),
    baseUrl: row.base_url,
    environment: row.environment,
    site: row.site,
    datacenter: row.datacenter,
    enabled: row.enabled,
    authMode: row.auth_mode,
    insecureTls: row.insecure_tls,
    notes: row.notes ?? undefined,
    secretEnc: row.secret_enc,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function listDbConnectors(): Promise<StoredConnector[]> {
  const { rows } = await pool.query<ConnectorDbRow>(
    `
      SELECT id, name, connector_type, base_url, environment, site, datacenter, enabled,
             auth_mode, insecure_tls, notes, secret_enc, created_at, updated_at
      FROM connectors
      ORDER BY created_at DESC
    `
  );
  return rows.map(fromDbRow);
}

async function getDbConnector(id: string): Promise<StoredConnector | null> {
  const { rows } = await pool.query<ConnectorDbRow>(
    `
      SELECT id, name, connector_type, base_url, environment, site, datacenter, enabled,
             auth_mode, insecure_tls, notes, secret_enc, created_at, updated_at
      FROM connectors
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ? fromDbRow(rows[0]) : null;
}

async function insertDbConnector(connector: StoredConnector): Promise<void> {
  await pool.query(
    `
      INSERT INTO connectors (
        id, name, connector_type, base_url, environment, site, datacenter, enabled,
        auth_mode, insecure_tls, notes, secret_enc, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13::timestamptz, $14::timestamptz
      )
    `,
    [
      connector.id,
      connector.name,
      connector.connectorType,
      connector.baseUrl,
      connector.environment,
      connector.site,
      connector.datacenter,
      connector.enabled,
      connector.authMode,
      connector.insecureTls,
      connector.notes ?? null,
      connector.secretEnc,
      connector.createdAt,
      connector.updatedAt,
    ]
  );
}

async function updateDbConnector(connector: StoredConnector): Promise<void> {
  await pool.query(
    `
      UPDATE connectors
      SET
        name = $2,
        connector_type = $3,
        base_url = $4,
        environment = $5,
        site = $6,
        datacenter = $7,
        enabled = $8,
        auth_mode = $9,
        insecure_tls = $10,
        notes = $11,
        secret_enc = $12,
        updated_at = $13::timestamptz
      WHERE id = $1
    `,
    [
      connector.id,
      connector.name,
      connector.connectorType,
      connector.baseUrl,
      connector.environment,
      connector.site,
      connector.datacenter,
      connector.enabled,
      connector.authMode,
      connector.insecureTls,
      connector.notes ?? null,
      connector.secretEnc,
      connector.updatedAt,
    ]
  );
}

async function deleteDbConnector(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM connectors WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

async function readLegacyStore(): Promise<StoredConnector[]> {
  try {
    const raw = await readFile(LEGACY_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as LegacyConnectorsStoreFile;
    if (!Array.isArray(parsed.connectors)) {
      return [];
    }
    return parsed.connectors.map((connector) => ({
      ...connector,
      connectorType: normalizeConnectorType(connector.connectorType, connector.id, connector.baseUrl),
    }));
  } catch {
    return [];
  }
}

function envBootstrapConnector(): StoredConnector | null {
  const baseUrl = process.env.PROMETHEUS_BASE_URL;
  if (!baseUrl) return null;

  const authMode: AuthMode = process.env.PROMETHEUS_BEARER_TOKEN
    ? "bearer"
    : process.env.PROMETHEUS_BASIC_AUTH_USER && process.env.PROMETHEUS_BASIC_AUTH_PASS
      ? "basic"
      : "none";

  const secret: SecretPayload =
    authMode === "bearer"
      ? { authMode: "bearer", bearerToken: process.env.PROMETHEUS_BEARER_TOKEN! }
      : authMode === "basic"
        ? {
            authMode: "basic",
            username: process.env.PROMETHEUS_BASIC_AUTH_USER!,
            password: process.env.PROMETHEUS_BASIC_AUTH_PASS!,
          }
        : { authMode: "none" };

  const now = new Date().toISOString();
  const plainSecret = `plain:${Buffer.from(JSON.stringify(secret), "utf8").toString("base64")}`;
  return {
    id: "env-default",
    name: "Env Default Connector",
    connectorType: normalizeConnectorType(undefined, "env-default", baseUrl),
    baseUrl,
    environment: "production",
    site: "default",
    datacenter: "default",
    enabled: true,
    authMode,
    insecureTls: process.env.PROMETHEUS_INSECURE_TLS === "true",
    notes: "Bootstrapped from environment",
    secretEnc: plainSecret,
    createdAt: now,
    updatedAt: now,
  };
}

let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      getRequiredEnv("DATABASE_URL");
      await mkdir(LEGACY_STORE_DIR, { recursive: true });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS connectors (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          connector_type TEXT NOT NULL,
          base_url TEXT NOT NULL,
          environment TEXT NOT NULL,
          site TEXT NOT NULL,
          datacenter TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          auth_mode TEXT NOT NULL,
          insecure_tls BOOLEAN NOT NULL DEFAULT FALSE,
          notes TEXT,
          secret_enc TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        ALTER TABLE connectors
        ADD COLUMN IF NOT EXISTS connector_type TEXT NOT NULL DEFAULT 'generic_prometheus'
      `);

      const countResult = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM connectors");
      const dbCount = Number(countResult.rows[0]?.count ?? "0");
      if (dbCount === 0) {
        const legacyConnectors = await readLegacyStore();
        for (const connector of legacyConnectors) {
          await insertDbConnector({
            ...connector,
            connectorType: normalizeConnectorType(connector.connectorType, connector.id, connector.baseUrl),
          });
        }
      }

      const envConnector = envBootstrapConnector();
      if (envConnector) {
        await pool.query(
          `
            INSERT INTO connectors (
              id, name, connector_type, base_url, environment, site, datacenter, enabled,
              auth_mode, insecure_tls, notes, secret_enc, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8,
              $9, $10, $11, $12, $13::timestamptz, $14::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              connector_type = EXCLUDED.connector_type,
              base_url = EXCLUDED.base_url,
              environment = EXCLUDED.environment,
              site = EXCLUDED.site,
              datacenter = EXCLUDED.datacenter,
              enabled = EXCLUDED.enabled,
              auth_mode = EXCLUDED.auth_mode,
              insecure_tls = EXCLUDED.insecure_tls,
              notes = EXCLUDED.notes,
              secret_enc = EXCLUDED.secret_enc,
              updated_at = EXCLUDED.updated_at
          `,
          [
            envConnector.id,
            envConnector.name,
            envConnector.connectorType,
            envConnector.baseUrl,
            envConnector.environment,
            envConnector.site,
            envConnector.datacenter,
            envConnector.enabled,
            envConnector.authMode,
            envConnector.insecureTls,
            envConnector.notes ?? null,
            envConnector.secretEnc,
            envConnector.createdAt,
            envConnector.updatedAt,
          ]
        );
      }

      await pool.query(
        `
          UPDATE connectors
          SET connector_type = CASE
            WHEN id = 'env-default' AND (
              base_url ILIKE '%cattle-monitoring-system%' OR
              base_url ILIKE '%rancher-monitoring-prometheus%' OR
              base_url ILIKE '%harvester%' OR
              base_url ILIKE '%nqrust-hypervisor%'
            ) THEN 'nqrust_hypervisor'
            ELSE 'generic_prometheus'
          END
          WHERE connector_type NOT IN ('nqrust_hypervisor', 'generic_prometheus', 'kubernetes_cluster')
        `
      );
    })();
  }

  return initPromise;
}

function validateConnectorType(connectorType: string | undefined): asserts connectorType is ConnectorType {
  if (!connectorType || !VALID_CONNECTOR_TYPES.has(connectorType as ConnectorType)) {
    throw new Error("connectorType is required and must be a valid connector type");
  }
}

function toPublicRecord(
  connector: StoredConnector,
  probe: { status: ConnectorStatus; lastCheckedAt: string; latencyMs: number; healthNotes?: string[] }
): ConnectorPublicRecord {
  return {
    id: connector.id,
    name: connector.name,
    connectorType: connector.connectorType,
    typeMeta: connectorTypeMeta(connector.connectorType),
    baseUrl: connector.baseUrl,
    environment: connector.environment,
    site: connector.site,
    datacenter: connector.datacenter,
    enabled: connector.enabled,
    authMode: connector.authMode,
    insecureTls: connector.insecureTls,
    notes: connector.notes,
    healthNotes: probe.healthNotes,
    ...probe,
  };
}

export async function listConnectors(): Promise<ConnectorPublicRecord[]> {
  await ensureInitialized();
  const connectors = await listDbConnectors();
  const records = await Promise.all(
    connectors.map(async (connector) => {
      const probe = connector.enabled
        ? await probeConnector(connector)
        : { status: "down" as ConnectorStatus, lastCheckedAt: new Date().toISOString(), latencyMs: 0 };
      return toPublicRecord(connector, probe);
    })
  );
  return records;
}

export async function getStoredConnector(id: string): Promise<StoredConnector | null> {
  await ensureInitialized();
  return getDbConnector(id);
}

export async function getConnectorConfig(id: string): Promise<PrometheusConnectorConfig | null> {
  const connector = await getStoredConnector(id);
  if (!connector || !connector.enabled) return null;
  try {
    const secret = decryptSecret(connector.secretEnc);
    return makeConnectorConfig(connector, secret);
  } catch (error) {
    console.error(`Failed to load connector secret for ${id}:`, error);
    return null;
  }
}

export async function createConnector(input: ConnectorCreateInput): Promise<ConnectorPublicRecord> {
  await ensureInitialized();
  validateConnectorType(input.connectorType);

  const id = `conn-${randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const authMode = input.authMode ?? "none";
  const secretEnc = encryptSecret(buildSecretPayload(input, authMode));

  const connector: StoredConnector = {
    id,
    name: input.name,
    connectorType: input.connectorType,
    baseUrl: input.baseUrl,
    environment: input.environment,
    site: input.site,
    datacenter: input.datacenter,
    enabled: input.enabled ?? true,
    authMode,
    insecureTls: input.insecureTls ?? false,
    notes: input.notes,
    secretEnc,
    createdAt: now,
    updatedAt: now,
  };

  await insertDbConnector(connector);
  const probe = await probeConnector(connector);
  return toPublicRecord(connector, probe);
}

export async function updateConnector(id: string, patch: ConnectorUpdateInput): Promise<ConnectorPublicRecord | null> {
  await ensureInitialized();
  const current = await getDbConnector(id);
  if (!current) return null;

  if (patch.connectorType !== undefined) {
    validateConnectorType(patch.connectorType);
  }

  const authMode = patch.authMode ?? current.authMode;
  let secretEnc = current.secretEnc;

  if (patch.authMode || patch.bearerToken || patch.username || patch.password) {
    secretEnc = encryptSecret(buildSecretPayload(patch, authMode));
  }

  const updated: StoredConnector = {
    ...current,
    name: patch.name ?? current.name,
    connectorType: patch.connectorType ?? current.connectorType,
    baseUrl: patch.baseUrl ?? current.baseUrl,
    environment: patch.environment ?? current.environment,
    site: patch.site ?? current.site,
    datacenter: patch.datacenter ?? current.datacenter,
    authMode,
    insecureTls: patch.insecureTls ?? current.insecureTls,
    notes: patch.notes ?? current.notes,
    enabled: patch.enabled ?? current.enabled,
    updatedAt: new Date().toISOString(),
    secretEnc,
  };

  await updateDbConnector(updated);

  const probe = updated.enabled
    ? await probeConnector(updated)
    : { status: "down" as ConnectorStatus, lastCheckedAt: new Date().toISOString(), latencyMs: 0 };

  return toPublicRecord(updated, probe);
}

export async function deleteConnector(id: string): Promise<boolean> {
  await ensureInitialized();
  return deleteDbConnector(id);
}

export async function testConnector(id: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const connector = await getStoredConnector(id);
  if (!connector) {
    return { success: false, latencyMs: 0, error: "Connector not found" };
  }
  const started = Date.now();
  try {
    const secret = decryptSecret(connector.secretEnc);
    await queryInstantWithConfig(makeConnectorConfig(connector, secret), "sum(up)");
    return { success: true, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}
