+++
title = "Live Data"
description = "SWR-polled endpoints that feed the dashboard — overview, hosts, clusters, VMs, apps, connectors, dashboards."
weight = 84
date = 2026-04-23

[extra]
toc = true
+++

Every `/api/live/*` endpoint is a thin wrapper around a single function in `lib/server/live-data.ts` (or the corresponding domain module). The browser polls these endpoints on a **30-second SWR cadence** — more frequent polling is wasteful because the underlying LRU cache hands back the same result within its TTL window.

{{% alert icon="⚡" context="info" %}}
Live endpoints are read-only and not session-guarded in the current implementation (they are browsable from inside the reverse proxy). They return `502` when the NQRust Hypervisor is unreachable and `500` on unexpected internal errors.
{{% /alert %}}

---

## Common shape

Every live endpoint responds with:

```json
{
  "data": [...],
  "meta": {
    "generatedAt": "2026-04-23T12:00:00.000Z",
    "sourceConnectors": [ { "id": "…", "name": "…", "status": "healthy" } ]
  }
}
```

Exact `data` shape varies per endpoint; `meta` is consistent.

---

## `GET /api/live/overview`

Aggregate cluster/host/storage/vm roll-up for the landing page. Also triggers a fire-and-forget alert evaluation pass against the freshly populated cache.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR poll |
| Cached? | Yes (warms `live:hosts`, `live:compute-clusters`, `live:storage-clusters`, `live:vm` as a side-effect) |

### Response — 200 OK (excerpt)

```json
{
  "data": {
    "summary": {
      "connectors": { "total": 6, "healthy": 5, "degraded": 1 },
      "hosts":      { "total": 412, "up": 409, "down": 3 },
      "clusters":   { "compute": 4, "storage": 2, "vm": 3 }
    },
    "topIssues": [ { "entityType": "host", "entityName": "web-02", "severity": "critical" } ]
  },
  "meta": { "generatedAt": "…", "sourceConnectors": [ ... ] }
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Aggregation failed. |

---

## `GET /api/live/hosts`

Flat list of every host visible across all enabled connectors, with current CPU %, memory %, load average, uptime, and up/down state.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": "host-42",
      "name": "web-02.us-east",
      "connectorId": "7c1a…",
      "environment": "prod",
      "site": "us-east",
      "datacenter": "dc1",
      "status": "up",
      "cpuPct": 68.3,
      "memoryPct": 74.1,
      "load1": 2.4,
      "uptimeSeconds": 1827340
    }
  ],
  "meta": { "generatedAt": "…", "sourceConnectors": [ ... ] }
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Aggregation failed. |

---

## `GET /api/live/compute-clusters`

Compute clusters (NQRust Hypervisor pools) with member hosts rolled up.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "compute-prod-us-east",
      "name": "prod-us-east-hv",
      "hostCount": 24,
      "cpuPct": 61.4,
      "memoryPct": 72.8,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Aggregation failed. |

---

## `GET /api/live/storage-clusters`

Storage clusters with capacity and usage metrics.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "storage-prod-a",
      "name": "longhorn-prod-a",
      "backend": "longhorn",
      "capacityBytes": 10995116277760,
      "usedBytes":     6597069766656,
      "volumeCount": 187,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Aggregation failed. |

---

## `GET /api/live/vm`

NQRust Hypervisor virtual machine inventory with per-VM resource allocation and host placement.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "vm-7a…",
      "name": "db-primary",
      "hostId": "host-42",
      "hostName": "hv-02.us-east",
      "cpuCores": 8,
      "memoryBytes": 17179869184,
      "cpuPct": 45.1,
      "memoryPct": 61.3,
      "uptimeSeconds": 942304,
      "status": "running"
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 502 | NQRust Hypervisor unreachable. |

---

## `GET /api/live/apps`

Application roll-up from workloads reported by NQRust Hypervisor.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "app-payments",
      "name": "payments",
      "namespace": "payments",
      "clusterId": "compute-prod-us-east",
      "replicasDesired": 6,
      "replicasReady": 6,
      "cpuPct": 34.2,
      "memoryPct": 48.7,
      "status": "healthy"
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 502 | NQRust Hypervisor unreachable. |

---

## `GET /api/live/connectors`

Snapshot of each connector's current health — used by the Connectors page. This endpoint returns **health-centric** data; use `/api/connectors` for the full CRUD record.

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "7c1a…",
      "name": "nqrust-prod-us-east",
      "connectorType": "nqrust_hypervisor",
      "status": "healthy",
      "latencyMs": 38,
      "lastCheckedAt": "2026-04-23T12:00:00.000Z",
      "healthNotes": []
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Aggregation failed. |

---

## `GET /api/live/dashboards`

Returns the user-facing dashboard catalog (curated views that mix hosts/clusters/apps in a single page).

| Query params | None |
|---|---|
| Typical cadence | 30s SWR |

### Response shape

```json
{
  "data": [
    {
      "id": "dash-prod-overview",
      "name": "Prod Overview",
      "description": "Top-of-stack view for the production environment",
      "widgets": [ { "kind": "host-count", "filter": { "environment": "prod" } } ]
    }
  ],
  "meta": { "…": "…" }
}
```

### Errors

| Status | Meaning |
|---|---|
| 502 | Upstream fetch failed. |

---

## Polling best practices

- **30-second SWR** is the pattern across the UI. Pollers should `revalidateOnFocus: true` but keep the base interval at 30s.
- Hit `/api/live/overview` first on page load — it warms downstream caches so subsequent page-specific polls are cache hits.
- For dashboards that only need counts, prefer `/api/alerts/count` (see [Alerts](../alerts/)) over the full alert list.
- If you are scripting outside the browser, you will still benefit from the LRU cache: within a 30-second window repeated calls do not re-hit NQRust Hypervisor.

---

## Next steps

- [Prometheus](../prometheus/) — pass-through PromQL for ad-hoc queries against a specific NQRust Hypervisor connector.
- [Connectors](../connectors/) — manage the data sources that feed every live endpoint.
- [Architecture → Request path](../../architecture/#request-path).
