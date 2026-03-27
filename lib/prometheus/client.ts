import "server-only";

import http from "node:http";
import https from "node:https";
import { Buffer } from "node:buffer";

interface PrometheusResponse<T = unknown> {
  status: "success" | "error";
  data?: T;
  errorType?: string;
  error?: string;
}

type PromResultType = "matrix" | "vector" | "scalar" | "string";

export interface PromMatrixResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export interface PromVectorResult {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PromQueryResult<T = PromMatrixResult | PromVectorResult> {
  resultType: PromResultType;
  result: T[];
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_BASE = "";

// ---------------------------------------------------------------------------
// Concurrency limiter — prevents overwhelming Prometheus with parallel queries
// when many connectors are active. Limits total in-flight HTTP requests.
// ---------------------------------------------------------------------------

const MAX_CONCURRENT_QUERIES = 20;
let activeQueries = 0;
const waitQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeQueries < MAX_CONCURRENT_QUERIES) {
    activeQueries++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(resolve);
  });
}

function releaseSlot(): void {
  if (waitQueue.length > 0) {
    const next = waitQueue.shift()!;
    next(); // hand the slot directly to the next waiter
  } else {
    activeQueries--;
  }
}
const DEFAULT_CPU_QUERY =
  "100 * (1 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])))";
const DEFAULT_MEMORY_QUERY =
  "100 * (1 - (sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)))";

export interface PrometheusConnectorConfig {
  baseUrl: string;
  authMode?: "none" | "bearer" | "basic";
  bearerToken?: string;
  basicUser?: string;
  basicPass?: string;
  insecureTls?: boolean;
  timeoutMs?: number;
}

function normalizeBaseUrl(raw: string): string {
  const parsed = new URL(raw);
  parsed.search = "";
  parsed.hash = "";
  parsed.pathname = parsed.pathname
    .replace(/\/api\/v1\/(query|query_range)\/?$/, "")
    .replace(/\/(query|query_range|graph)\/?$/, "");
  return parsed.toString().replace(/\/$/, "");
}

function getBaseUrl(): string {
  const raw = process.env.PROMETHEUS_BASE_URL ?? DEFAULT_BASE;
  if (!raw) {
    throw new Error("PROMETHEUS_BASE_URL is not configured");
  }
  return normalizeBaseUrl(raw);
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.PROMETHEUS_BEARER_TOKEN;
  const user = process.env.PROMETHEUS_BASIC_AUTH_USER;
  const pass = process.env.PROMETHEUS_BASIC_AUTH_PASS;

  if (token) return { Authorization: `Bearer ${token}` };
  if (user && pass) {
    const creds = Buffer.from(`${user}:${pass}`).toString("base64");
    return { Authorization: `Basic ${creds}` };
  }

  return {};
}

function getHeadersForConfig(config: PrometheusConnectorConfig): Record<string, string> {
  if (config.authMode === "bearer" && config.bearerToken) {
    return { Authorization: `Bearer ${config.bearerToken}` };
  }
  if (config.authMode === "basic" && config.basicUser && config.basicPass) {
    const creds = Buffer.from(`${config.basicUser}:${config.basicPass}`).toString("base64");
    return { Authorization: `Basic ${creds}` };
  }
  return {};
}

function httpGetJson<T>(url: URL, headers: Record<string, string>): Promise<T> {
  const isHttps = url.protocol === "https:";
  const insecureTls = process.env.PROMETHEUS_INSECURE_TLS === "true";
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...headers,
        },
        timeout: DEFAULT_TIMEOUT_MS,
        ...(isHttps ? { rejectUnauthorized: !insecureTls } : {}),
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Prometheus returned HTTP ${res.statusCode ?? "unknown"}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("Prometheus returned non-JSON response"));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Prometheus request timed out"));
    });
    req.end();
  });
}

function httpGetJsonWithConfig<T>(url: URL, headers: Record<string, string>, config: PrometheusConnectorConfig): Promise<T> {
  const isHttps = url.protocol === "https:";
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...headers,
        },
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        ...(isHttps ? { rejectUnauthorized: !config.insecureTls } : {}),
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Prometheus returned HTTP ${res.statusCode ?? "unknown"}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("Prometheus returned non-JSON response"));
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Prometheus request timed out"));
    });
    req.end();
  });
}

function createEndpoint(path: "/query" | "/query_range", params: Record<string, string>): URL {
  const base = getBaseUrl();
  const endpoint = new URL(`${base}/api/v1${path}`);
  for (const [key, value] of Object.entries(params)) {
    endpoint.searchParams.set(key, value);
  }
  return endpoint;
}

function createEndpointForBase(baseUrl: string, path: "/query" | "/query_range", params: Record<string, string>): URL {
  const normalized = normalizeBaseUrl(baseUrl);
  const endpoint = new URL(`${normalized}/api/v1${path}`);
  for (const [key, value] of Object.entries(params)) {
    endpoint.searchParams.set(key, value);
  }
  return endpoint;
}

async function runQuery<T>(
  path: "/query" | "/query_range",
  params: Record<string, string>
): Promise<PromQueryResult<T>> {
  await acquireSlot();
  try {
    const endpoint = createEndpoint(path, params);
    const payload = await httpGetJson<PrometheusResponse<PromQueryResult<T>>>(endpoint, getAuthHeaders());

    if (payload.status !== "success" || !payload.data) {
      throw new Error(payload.error || payload.errorType || "Prometheus query failed");
    }

    return payload.data;
  } finally {
    releaseSlot();
  }
}

export async function queryInstant(query: string, time?: string): Promise<PromQueryResult<PromVectorResult>> {
  return runQuery<PromVectorResult>("/query", {
    query,
    ...(time ? { time } : {}),
  });
}

export async function queryRange(
  query: string,
  start: string,
  end: string,
  step: string
): Promise<PromQueryResult<PromMatrixResult>> {
  return runQuery<PromMatrixResult>("/query_range", { query, start, end, step });
}

export async function queryInstantWithConfig(
  config: PrometheusConnectorConfig,
  query: string,
  time?: string
): Promise<PromQueryResult<PromVectorResult>> {
  await acquireSlot();
  try {
    const endpoint = createEndpointForBase(config.baseUrl, "/query", {
      query,
      ...(time ? { time } : {}),
    });
    const payload = await httpGetJsonWithConfig<PrometheusResponse<PromQueryResult<PromVectorResult>>>(
      endpoint,
      getHeadersForConfig(config),
      config
    );

    if (payload.status !== "success" || !payload.data) {
      throw new Error(payload.error || payload.errorType || "Prometheus query failed");
    }

    return payload.data;
  } finally {
    releaseSlot();
  }
}

export async function queryRangeWithConfig(
  config: PrometheusConnectorConfig,
  query: string,
  start: string,
  end: string,
  step: string
): Promise<PromQueryResult<PromMatrixResult>> {
  await acquireSlot();
  try {
    const endpoint = createEndpointForBase(config.baseUrl, "/query_range", {
      query,
      start,
      end,
      step,
    });
    const payload = await httpGetJsonWithConfig<PrometheusResponse<PromQueryResult<PromMatrixResult>>>(
      endpoint,
      getHeadersForConfig(config),
      config
    );

    if (payload.status !== "success" || !payload.data) {
      throw new Error(payload.error || payload.errorType || "Prometheus range query failed");
    }

    return payload.data;
  } finally {
    releaseSlot();
  }
}

export function getCpuUsagePromQl(): string {
  return process.env.PROMETHEUS_CPU_USAGE_QUERY || DEFAULT_CPU_QUERY;
}

export function getMemoryUsagePromQl(): string {
  return process.env.PROMETHEUS_MEMORY_USAGE_QUERY || DEFAULT_MEMORY_QUERY;
}
