import "server-only";

import { pool } from "./db";
import { encryptString, decryptString } from "./encryption";
import type { SsoConfig, SsoConfigInput, SsoProviderSummary, SsoProviderId } from "@/lib/types";

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureSsoTables(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sso_config (
          id TEXT PRIMARY KEY,
          enabled BOOLEAN NOT NULL DEFAULT FALSE,
          display_name TEXT NOT NULL DEFAULT '',
          saml_idp_sso_url TEXT,
          saml_idp_issuer TEXT,
          saml_idp_cert_enc TEXT,
          saml_sp_entity_id TEXT,
          oidc_issuer_url TEXT,
          oidc_client_id TEXT,
          oidc_client_secret_enc TEXT,
          oidc_scopes TEXT DEFAULT 'openid email profile',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sso_state (
          state TEXT PRIMARY KEY,
          nonce TEXT,
          code_verifier TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      initialized = true;
    })();
  }
  await initPromise;
}

// ---------------------------------------------------------------------------
// SSO Config CRUD
// ---------------------------------------------------------------------------

interface SsoConfigRow {
  id: string;
  enabled: boolean;
  display_name: string;
  saml_idp_sso_url: string | null;
  saml_idp_issuer: string | null;
  saml_idp_cert_enc: string | null;
  saml_sp_entity_id: string | null;
  oidc_issuer_url: string | null;
  oidc_client_id: string | null;
  oidc_client_secret_enc: string | null;
  oidc_scopes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToConfig(row: SsoConfigRow): SsoConfig {
  return {
    id: row.id as SsoProviderId,
    enabled: row.enabled,
    displayName: row.display_name,
    samlIdpSsoUrl: row.saml_idp_sso_url ?? undefined,
    samlIdpIssuer: row.saml_idp_issuer ?? undefined,
    samlIdpCert: row.saml_idp_cert_enc ? decryptString(row.saml_idp_cert_enc) : undefined,
    samlSpEntityId: row.saml_sp_entity_id ?? undefined,
    oidcIssuerUrl: row.oidc_issuer_url ?? undefined,
    oidcClientId: row.oidc_client_id ?? undefined,
    oidcClientSecret: row.oidc_client_secret_enc
      ? decryptString(row.oidc_client_secret_enc)
      : undefined,
    oidcScopes: row.oidc_scopes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSsoConfig(id: SsoProviderId): Promise<SsoConfig | null> {
  await ensureSsoTables();
  const result = await pool.query<SsoConfigRow>(
    "SELECT * FROM sso_config WHERE id = $1",
    [id]
  );
  const row = result.rows[0];
  if (!row) return null;
  return rowToConfig(row);
}

export async function upsertSsoConfig(input: SsoConfigInput): Promise<SsoConfig> {
  await ensureSsoTables();

  const certEnc = input.samlIdpCert ? encryptString(input.samlIdpCert) : null;
  const secretEnc = input.oidcClientSecret ? encryptString(input.oidcClientSecret) : null;

  const result = await pool.query<SsoConfigRow>(
    `INSERT INTO sso_config (
      id, enabled, display_name,
      saml_idp_sso_url, saml_idp_issuer, saml_idp_cert_enc, saml_sp_entity_id,
      oidc_issuer_url, oidc_client_id, oidc_client_secret_enc, oidc_scopes,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      display_name = EXCLUDED.display_name,
      saml_idp_sso_url = EXCLUDED.saml_idp_sso_url,
      saml_idp_issuer = EXCLUDED.saml_idp_issuer,
      saml_idp_cert_enc = COALESCE(EXCLUDED.saml_idp_cert_enc, sso_config.saml_idp_cert_enc),
      saml_sp_entity_id = EXCLUDED.saml_sp_entity_id,
      oidc_issuer_url = EXCLUDED.oidc_issuer_url,
      oidc_client_id = EXCLUDED.oidc_client_id,
      oidc_client_secret_enc = COALESCE(EXCLUDED.oidc_client_secret_enc, sso_config.oidc_client_secret_enc),
      oidc_scopes = EXCLUDED.oidc_scopes,
      updated_at = NOW()
    RETURNING *`,
    [
      input.id,
      input.enabled,
      input.displayName,
      input.samlIdpSsoUrl ?? null,
      input.samlIdpIssuer ?? null,
      certEnc,
      input.samlSpEntityId ?? null,
      input.oidcIssuerUrl ?? null,
      input.oidcClientId ?? null,
      secretEnc,
      input.oidcScopes ?? "openid email profile",
    ]
  );

  return rowToConfig(result.rows[0]);
}

export async function deleteSsoConfig(id: SsoProviderId): Promise<boolean> {
  await ensureSsoTables();
  const result = await pool.query("DELETE FROM sso_config WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function listEnabledSsoProviders(): Promise<SsoProviderSummary[]> {
  await ensureSsoTables();
  const result = await pool.query<{ id: string; display_name: string }>(
    "SELECT id, display_name FROM sso_config WHERE enabled = TRUE"
  );
  return result.rows.map((row) => ({
    id: row.id as SsoProviderId,
    displayName: row.display_name,
  }));
}

export async function listAllSsoConfigs(): Promise<SsoConfig[]> {
  await ensureSsoTables();
  const result = await pool.query<SsoConfigRow>("SELECT * FROM sso_config ORDER BY id");
  return result.rows.map(rowToConfig);
}

// ---------------------------------------------------------------------------
// OAuth State Management (ephemeral, single-use)
// ---------------------------------------------------------------------------

export async function createSsoState(
  state: string,
  nonce: string,
  codeVerifier: string
): Promise<void> {
  await ensureSsoTables();
  await pool.query(
    "INSERT INTO sso_state (state, nonce, code_verifier) VALUES ($1, $2, $3)",
    [state, nonce, codeVerifier]
  );
}

export async function consumeSsoState(
  state: string
): Promise<{ nonce: string; codeVerifier: string } | null> {
  await ensureSsoTables();
  const result = await pool.query<{ nonce: string; code_verifier: string; created_at: string }>(
    "DELETE FROM sso_state WHERE state = $1 RETURNING nonce, code_verifier, created_at",
    [state]
  );
  const row = result.rows[0];
  if (!row) return null;

  // Reject states older than 10 minutes
  const age = Date.now() - new Date(row.created_at).getTime();
  if (age > 10 * 60 * 1000) return null;

  return { nonce: row.nonce, codeVerifier: row.code_verifier };
}

export async function cleanExpiredSsoStates(): Promise<void> {
  await ensureSsoTables();
  await pool.query(
    "DELETE FROM sso_state WHERE created_at < NOW() - INTERVAL '10 minutes'"
  );
}
