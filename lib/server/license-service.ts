import "server-only";

import crypto from "node:crypto";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { pool, ensureLicenseTable } from "./db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LicenseState {
  isLicensed: boolean;
  status: "active" | "expired" | "invalid" | "grace_period" | "unlicensed" | "unknown";
  isGracePeriod: boolean;
  graceDaysRemaining: number | null;
  customerName: string | null;
  product: string | null;
  features: string[];
  expiresAt: string | null;
  activations: number | null;
  maxActivations: number | null;
  verifiedAt: string | null;
  licenseKey: string | null;
  errorMessage: string | null;
}

interface LicenseConfig {
  licenseServerUrl: string;
  licenseApiKey: string;
  gracePeriodDays: number;
  publicKeyPem: string | null;
  persistDir: string;
}

const UNLICENSED: LicenseState = {
  isLicensed: false,
  status: "unlicensed",
  isGracePeriod: false,
  graceDaysRemaining: null,
  customerName: null,
  product: null,
  features: [],
  expiresAt: null,
  activations: null,
  maxActivations: null,
  verifiedAt: null,
  licenseKey: null,
  errorMessage: null,
};

// ---------------------------------------------------------------------------
// Device ID
// ---------------------------------------------------------------------------

function generateDeviceId(): string {
  const info = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || "",
  ].join("|");
  return crypto.createHash("sha256").update(info).digest("hex").slice(0, 32);
}

function getOrCreateDeviceId(persistDir: string): string {
  const idFile = path.join(persistDir, ".device-id");
  try {
    const existing = fs.readFileSync(idFile, "utf-8").trim();
    if (existing) return existing;
  } catch {}
  const deviceId = generateDeviceId();
  fs.mkdirSync(path.dirname(idFile), { recursive: true });
  fs.writeFileSync(idFile, deviceId, "utf-8");
  return deviceId;
}

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

function maskKey(key: string): string {
  const parts = key.split("-");
  if (parts.length !== 4) return "****";
  return `${parts[0]}-****-****-${parts[3]}`;
}

function loadPersistedKey(persistDir: string): string | null {
  try {
    return fs.readFileSync(path.join(persistDir, ".license-key"), "utf-8").trim() || null;
  } catch {
    return null;
  }
}

function persistKey(persistDir: string, key: string): void {
  fs.mkdirSync(persistDir, { recursive: true });
  fs.writeFileSync(path.join(persistDir, ".license-key"), key, "utf-8");
}

// ---------------------------------------------------------------------------
// Offline .lic verification
// ---------------------------------------------------------------------------

interface OfflineLicensePayload {
  licenseId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  features: string[];
  maxActivations?: number;
  issuedAt: string;
  expiresAt: string;
}

function parseAndVerifyLicenseFile(
  fileContent: string,
  publicKeyPem: string
): { valid: boolean; payload?: OfflineLicensePayload; error?: string } {
  const licenseMatch = fileContent.match(
    /-----BEGIN LICENSE-----\s*([\s\S]*?)\s*-----END LICENSE-----/
  );
  const sigMatch = fileContent.match(
    /-----BEGIN SIGNATURE-----\s*([\s\S]*?)\s*-----END SIGNATURE-----/
  );
  if (!licenseMatch || !sigMatch) {
    return { valid: false, error: "Invalid license file format" };
  }
  const licenseB64 = licenseMatch[1].replace(/\s/g, "");
  const signatureB64 = sigMatch[1].replace(/\s/g, "");

  try {
    const keyObj = crypto.createPublicKey(publicKeyPem);
    const algo = keyObj.asymmetricKeyType;
    const sigBuf = Buffer.from(signatureB64, "base64");

    // Try multiple data formats — servers may sign the b64 string or the decoded bytes
    const candidates = [
      Buffer.from(licenseB64, "utf-8"),                     // base64 string as-is
      Buffer.from(licenseB64, "base64"),                    // decoded raw bytes
      Buffer.from(licenseB64 + "\n", "utf-8"),              // with trailing newline
    ];

    let verified = false;
    for (const data of candidates) {
      try {
        if (algo === "ed25519" || algo === "ed448") {
          if (crypto.verify(null, data, keyObj, sigBuf)) { verified = true; break; }
        } else {
          const verifier = crypto.createVerify("SHA256");
          verifier.update(data);
          if (verifier.verify(keyObj, sigBuf)) { verified = true; break; }
        }
      } catch { /* try next */ }
    }

    if (!verified) {
      return { valid: false, error: "Invalid signature — file may be tampered" };
    }
  } catch (err) {
    return { valid: false, error: `Signature verification failed: ${err instanceof Error ? err.message : "unknown"}` };
  }

  const payloadJson = Buffer.from(licenseB64, "base64").toString("utf-8");
  const payload: OfflineLicensePayload = JSON.parse(payloadJson);

  if (new Date(payload.expiresAt) < new Date()) {
    return { valid: false, payload, error: "License has expired" };
  }
  return { valid: true, payload };
}

// ---------------------------------------------------------------------------
// DB cache
// ---------------------------------------------------------------------------

async function upsertLicenseCache(data: {
  licenseKey: string;
  status: string;
  customerName?: string;
  product?: string;
  productId?: string;
  customerId?: string;
  features?: string;
  expiresAt?: string;
  verifiedAt?: string;
  activations?: number;
  maxActivations?: number;
  cachedResponse?: string;
  deviceId?: string;
  isOffline?: boolean;
}): Promise<void> {
  await ensureLicenseTable();
  const existing = await pool.query("SELECT id FROM license LIMIT 1");
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE license SET
        license_key = $1, status = $2, customer_name = $3, product = $4,
        product_id = $5, customer_id = $6, features = $7, expires_at = $8,
        verified_at = $9, activations = $10, max_activations = $11,
        cached_response = $12, device_id = $13, is_offline = $14, updated_at = NOW()
       WHERE id = $15`,
      [
        data.licenseKey, data.status, data.customerName ?? null, data.product ?? null,
        data.productId ?? null, data.customerId ?? null, data.features ?? null, data.expiresAt ?? null,
        data.verifiedAt ?? null, data.activations ?? null, data.maxActivations ?? null,
        data.cachedResponse ?? null, data.deviceId ?? null, data.isOffline ?? false,
        existing.rows[0].id,
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO license (license_key, status, customer_name, product, product_id, customer_id, features, expires_at, verified_at, activations, max_activations, cached_response, device_id, is_offline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        data.licenseKey, data.status, data.customerName ?? null, data.product ?? null,
        data.productId ?? null, data.customerId ?? null, data.features ?? null, data.expiresAt ?? null,
        data.verifiedAt ?? null, data.activations ?? null, data.maxActivations ?? null,
        data.cachedResponse ?? null, data.deviceId ?? null, data.isOffline ?? false,
      ]
    );
  }
}

async function getCachedLicense(): Promise<Record<string, unknown> | null> {
  await ensureLicenseTable();
  const result = await pool.query("SELECT * FROM license ORDER BY updated_at DESC LIMIT 1");
  return result.rows[0] ?? null;
}

async function clearLicenseCache(): Promise<void> {
  await ensureLicenseTable();
  await pool.query("DELETE FROM license");
}

// ---------------------------------------------------------------------------
// License Service (singleton)
// ---------------------------------------------------------------------------

let cachedState: LicenseState = { ...UNLICENSED };

function getConfig(): LicenseConfig {
  return {
    licenseServerUrl: process.env.LICENSE_SERVER_URL || "https://billing.nexusquantum.id",
    licenseApiKey: process.env.LICENSE_API_KEY || "",
    gracePeriodDays: Number(process.env.LICENSE_GRACE_PERIOD_DAYS) || 7,
    publicKeyPem: process.env.LICENSE_PUBLIC_KEY?.replace(/\\n/g, "\n") || null,
    persistDir: path.join(process.cwd(), ".data"),
  };
}

function getDeviceId(): string {
  return getOrCreateDeviceId(getConfig().persistDir);
}

export function getLicenseState(): LicenseState {
  return { ...cachedState };
}

async function verifyOnline(licenseKey: string): Promise<LicenseState> {
  const config = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${config.licenseServerUrl}/api/v1/licenses/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.licenseApiKey}`,
      },
      body: JSON.stringify({
        licenseKey,
        deviceId: getDeviceId(),
        deviceName: "NQRust-InfraWatch",
      }),
      signal: controller.signal,
    });

    const data = await res.json();
    if (data.valid && data.license) {
      return {
        isLicensed: true,
        status: "active",
        isGracePeriod: false,
        graceDaysRemaining: null,
        customerName: data.license.customer,
        product: data.license.product,
        features: data.license.features || [],
        expiresAt: data.license.expiresAt,
        activations: data.activations ?? null,
        maxActivations: data.maxActivations ?? null,
        verifiedAt: new Date().toISOString(),
        licenseKey: maskKey(licenseKey),
        errorMessage: null,
      };
    }

    return {
      ...UNLICENSED,
      status: data.error === "license_expired" ? "expired" : "invalid",
      licenseKey: maskKey(licenseKey),
      errorMessage: data.message || data.error || "Verification failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function activateLicenseKey(licenseKey: string): Promise<LicenseState> {
  const config = getConfig();
  const state = await verifyOnline(licenseKey);

  if (state.isLicensed) {
    persistKey(config.persistDir, licenseKey);
    await upsertLicenseCache({
      licenseKey,
      status: "active",
      customerName: state.customerName ?? undefined,
      product: state.product ?? undefined,
      features: JSON.stringify(state.features),
      expiresAt: state.expiresAt ?? undefined,
      verifiedAt: state.verifiedAt ?? undefined,
      activations: state.activations ?? undefined,
      maxActivations: state.maxActivations ?? undefined,
      deviceId: getDeviceId(),
    });
  }

  cachedState = state;
  return state;
}

export async function uploadLicenseFile(fileContent: string): Promise<LicenseState> {
  const config = getConfig();
  if (!config.publicKeyPem) {
    return { ...UNLICENSED, errorMessage: "Offline license verification is not configured (no public key)" };
  }

  const result = parseAndVerifyLicenseFile(fileContent, config.publicKeyPem);
  if (!result.valid || !result.payload) {
    return { ...UNLICENSED, status: "invalid", errorMessage: result.error || "Invalid license file" };
  }

  const p = result.payload;

  // Save .lic to disk
  const licPath = path.join(config.persistDir, "license.lic");
  fs.mkdirSync(config.persistDir, { recursive: true });
  fs.writeFileSync(licPath, fileContent, "utf-8");

  const state: LicenseState = {
    isLicensed: true,
    status: "active",
    isGracePeriod: false,
    graceDaysRemaining: null,
    customerName: p.customerName,
    product: p.productName,
    features: p.features,
    expiresAt: p.expiresAt,
    activations: null,
    maxActivations: p.maxActivations ?? null,
    verifiedAt: new Date().toISOString(),
    licenseKey: maskKey(p.licenseId),
    errorMessage: null,
  };

  await upsertLicenseCache({
    licenseKey: p.licenseId,
    status: "active",
    customerName: p.customerName,
    product: p.productName,
    productId: p.productId,
    customerId: p.customerId,
    features: JSON.stringify(p.features),
    expiresAt: p.expiresAt,
    verifiedAt: state.verifiedAt!,
    deviceId: getDeviceId(),
    isOffline: true,
  });

  cachedState = state;
  return state;
}

export async function checkLicense(): Promise<LicenseState> {
  const config = getConfig();
  const key = loadPersistedKey(config.persistDir) || process.env.LICENSE_KEY;

  if (!key) {
    // Check DB for existing cached license
    const cached = await getCachedLicense();
    if (!cached) {
      cachedState = { ...UNLICENSED };
      return cachedState;
    }
    // Fall through to grace period check
    return checkGracePeriod(cached, config.gracePeriodDays);
  }

  // Tier 1: Online
  try {
    const state = await verifyOnline(key);
    if (state.isLicensed) {
      await upsertLicenseCache({
        licenseKey: key,
        status: "active",
        customerName: state.customerName ?? undefined,
        product: state.product ?? undefined,
        features: JSON.stringify(state.features),
        expiresAt: state.expiresAt ?? undefined,
        verifiedAt: state.verifiedAt ?? undefined,
        activations: state.activations ?? undefined,
        maxActivations: state.maxActivations ?? undefined,
        deviceId: getDeviceId(),
      });
    }
    cachedState = state;
    return state;
  } catch (err) {
    console.warn("[license] Online verification failed:", err);
  }

  // Tier 2: Offline .lic file
  if (config.publicKeyPem) {
    try {
      const licPath = path.join(config.persistDir, "license.lic");
      const content = fs.readFileSync(licPath, "utf-8");
      const result = parseAndVerifyLicenseFile(content, config.publicKeyPem);
      if (result.valid && result.payload) {
        const state: LicenseState = {
          isLicensed: true,
          status: "active",
          isGracePeriod: false,
          graceDaysRemaining: null,
          customerName: result.payload.customerName,
          product: result.payload.productName,
          features: result.payload.features,
          expiresAt: result.payload.expiresAt,
          activations: null,
          maxActivations: result.payload.maxActivations ?? null,
          verifiedAt: new Date().toISOString(),
          licenseKey: maskKey(result.payload.licenseId),
          errorMessage: null,
        };
        cachedState = state;
        return state;
      }
    } catch {}
  }

  // Tier 3: Cached DB + grace period
  const cached = await getCachedLicense();
  if (cached) {
    const state = checkGracePeriod(cached, config.gracePeriodDays);
    cachedState = state;
    return state;
  }

  cachedState = { ...UNLICENSED };
  return cachedState;
}

function checkGracePeriod(
  cached: Record<string, unknown>,
  gracePeriodDays: number
): LicenseState {
  if (cached.status !== "active") return { ...UNLICENSED };

  const verifiedAt = cached.verified_at ? new Date(cached.verified_at as string) : null;
  if (!verifiedAt) return { ...UNLICENSED };

  const daysSince = Math.floor((Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince <= gracePeriodDays) {
    let features: string[] = [];
    try { features = JSON.parse((cached.features as string) || "[]"); } catch {}

    return {
      isLicensed: true,
      status: "grace_period",
      isGracePeriod: true,
      graceDaysRemaining: gracePeriodDays - daysSince,
      customerName: (cached.customer_name as string) ?? null,
      product: (cached.product as string) ?? null,
      features,
      expiresAt: (cached.expires_at as string) ?? null,
      activations: (cached.activations as number) ?? null,
      maxActivations: (cached.max_activations as number) ?? null,
      verifiedAt: cached.verified_at as string,
      licenseKey: maskKey((cached.license_key as string) || ""),
      errorMessage: null,
    };
  }

  return {
    ...UNLICENSED,
    errorMessage: `Grace period expired. Last verified ${daysSince} days ago.`,
  };
}

export async function deactivateLicense(): Promise<void> {
  const config = getConfig();
  try { fs.unlinkSync(path.join(config.persistDir, ".license-key")); } catch {}
  try { fs.unlinkSync(path.join(config.persistDir, "license.lic")); } catch {}
  await clearLicenseCache();
  cachedState = { ...UNLICENSED };
}

// Initialize on first import
checkLicense().catch((err) => console.error("[license] Initial check failed:", err));
