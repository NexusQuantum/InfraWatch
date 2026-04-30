+++
title = "Connectors"
description = "CRUD and connectivity-test endpoints for NQRust Hypervisor metrics sources."
weight = 82
date = 2026-04-23

[extra]
toc = true
+++

A connector is the credentialed link InfraWatch uses to reach a NQRust Hypervisor node's embedded Prometheus endpoint. Every host, cluster, VM, and application in the fleet view is sourced through these records.

{{% alert icon="🔐" context="warning" %}}
All connector endpoints require an authenticated session. Mutations additionally require the `X-CSRF-Token` header. Credentials (`bearerToken`, `password`) are encrypted at rest with `CONNECTOR_ENCRYPTION_KEY` and never returned by GET.
{{% /alert %}}

---

## Connector fields

| Field | Type | Required on create | Notes |
|---|---|---|---|
| `name` | string | yes | Operator-chosen display name. |
| `connectorType` | `nqrust_hypervisor` | yes | Must be `nqrust_hypervisor`. |
| `baseUrl` | string | yes | Base URL of the NQRust Hypervisor's embedded Prometheus (`/api/v1` root). |
| `environment` | string | yes | Scoping label (`prod`, `stg`, …). |
| `site` | string | yes | Geographic scoping label. |
| `datacenter` | string | yes | Fine-grained scoping label. |
| `authMode` | `none` \| `basic` \| `bearer` | yes | Picks which credential fields are required. |
| `username` | string | only if `authMode=basic` | Basic auth username. |
| `password` | string | only if `authMode=basic` | Basic auth password. |
| `bearerToken` | string | only if `authMode=bearer` | Bearer token. |
| `insecureTls` | boolean | no | Skip TLS verification for self-signed certs. Defaults to false. |
| `notes` | string | no | Free-form operator notes. |
| `enabled` | boolean | no | Defaults to true; if false, the domain layer skips this connector. |

---

## `GET /api/connectors`

List all connectors.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Session required |
| CSRF | Not required |

### Response — 200 OK

Secrets are never returned. Each row includes derived health metadata (`status`, `lastCheckedAt`, `latencyMs`, `healthNotes`) populated by the latest probe.

```json
{
  "data": [
    {
      "id": "7c1a…",
      "name": "nqrust-prod-us-east",
      "connectorType": "nqrust_hypervisor",
      "typeMeta": {
        "key": "nqrust_hypervisor",
        "label": "NQRust Hypervisor",
        "iconKey": "activity",
        "expectedCapabilities": [],
        "quickFixTips": ["…"]
      },
      "baseUrl": "https://prom.us-east.example.com",
      "environment": "prod",
      "site": "us-east",
      "datacenter": "dc1",
      "enabled": true,
      "authMode": "bearer",
      "insecureTls": false,
      "notes": "Primary hypervisor for us-east dc1",
      "status": "healthy",
      "lastCheckedAt": "2026-04-23T12:34:56.789Z",
      "latencyMs": 42,
      "healthNotes": []
    }
  ]
}
```

### Errors

| Status | Meaning |
|---|---|
| 401 | No session cookie or expired session. |
| 500 | Failed to list connectors (see `error` in body). |

### Example

```bash
curl -b cookies.txt https://infrawatch.example.com/api/connectors
```

---

## `POST /api/connectors`

Create a new connector.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | Session required |
| CSRF | **Required** (`X-CSRF-Token`) |

### Request body

```json
{
  "name": "nqrust-prod-us-east",
  "connectorType": "nqrust_hypervisor",
  "baseUrl": "https://hv.us-east.example.com",
  "environment": "prod",
  "site": "us-east",
  "datacenter": "dc1",
  "authMode": "bearer",
  "bearerToken": "eyJhbGciOi…",
  "insecureTls": false,
  "notes": "Primary hypervisor for us-east dc1"
}
```

For basic auth, send `username` / `password` instead of `bearerToken`. For no auth, omit all three.

### Response — 201 Created

```json
{
  "data": {
    "id": "7c1a…",
    "name": "nqrust-prod-us-east",
    "connectorType": "nqrust_hypervisor",
    "baseUrl": "https://hv.us-east.example.com",
    "environment": "prod",
    "site": "us-east",
    "datacenter": "dc1",
    "authMode": "bearer",
    "insecureTls": false,
    "enabled": true
  }
}
```

The handler also invalidates the `live:*` cache prefix and writes a `connector.create` audit-log entry.

### Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed — missing credential for the chosen `authMode`, invalid type, or bad URL. |
| 401 | No session. |
| 403 | Missing or mismatched CSRF token. |

### Example

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors \
  -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" \
  -d '{
    "name":"nqrust-prod-us-east",
    "connectorType":"nqrust_hypervisor",
    "baseUrl":"https://hv.us-east.example.com",
    "environment":"prod","site":"us-east","datacenter":"dc1",
    "authMode":"bearer","bearerToken":"eyJhbGciOi…"
  }'
```

---

## `GET /api/connectors/[id]`

Fetch a single connector by id.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Session required |
| CSRF | Not required |

### Response — 200 OK

Same shape as a list row.

### Errors

| Status | Meaning |
|---|---|
| 401 | No session. |
| 404 | `{ "error": "Connector not found" }`. |

---

## `PATCH /api/connectors/[id]`

Update fields on an existing connector. Any subset of the create body is accepted; unspecified fields are left untouched. Omitting a credential field does **not** clear the stored secret — to clear it, set `authMode: "none"`.

| Attribute | Value |
|---|---|
| Method | `PATCH` |
| Auth | Session required |
| CSRF | **Required** |

### Request body (example — toggle `enabled`)

```json
{ "enabled": false }
```

### Response — 200 OK

```json
{ "data": { "id": "7c1a…", "enabled": false, "…": "…" } }
```

Also invalidates `live:*` cache and writes a `connector.update` audit entry.

### Errors

| Status | Meaning |
|---|---|
| 400 | Invalid payload. |
| 401 | No session. |
| 403 | Missing CSRF token. |
| 404 | Connector not found. |

{{% alert icon="⚡" context="info" %}}
`PUT` is **not** implemented for connectors. Use `PATCH` for all updates.
{{% /alert %}}

---

## `DELETE /api/connectors/[id]`

Remove a connector. Associated `connector_health` rows are deleted by cascade; alerts that reference the connector keep their labels but will auto-resolve on the next evaluation if the underlying entities disappear.

| Attribute | Value |
|---|---|
| Method | `DELETE` |
| Auth | Session required |
| CSRF | **Required** |

### Response — 200 OK

```json
{ "success": true }
```

Also invalidates `live:*` cache and writes a `connector.delete` audit entry.

### Errors

| Status | Meaning |
|---|---|
| 401 | No session. |
| 403 | Missing CSRF token. |
| 404 | Connector not found. |

### Example

```bash
curl -b cookies.txt -X DELETE https://infrawatch.example.com/api/connectors/7c1a… \
  -H "X-CSRF-Token: $CSRF"
```

---

## `POST /api/connectors/[id]/test`

Run a live connectivity + soft-check probe against the connector and return the result without persisting a health row yet.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | Not enforced on this route (internal helper used by the UI) |
| CSRF | Not required |

### Request body

None.

### Response — 200 OK (success)

```json
{
  "data": {
    "success": true,
    "latencyMs": 38,
    "notes": [],
    "capabilities": { "hostMetrics": true, "clusterMetrics": true }
  }
}
```

### Response — 502 Bad Gateway (probe failed)

The handler still returns the structured result, but with `success: false`:

```json
{
  "data": {
    "success": false,
    "latencyMs": 1503,
    "error": "connect ETIMEDOUT",
    "notes": ["TLS handshake failed", "…"]
  }
}
```

### Example

```bash
curl -b cookies.txt -X POST https://infrawatch.example.com/api/connectors/7c1a…/test
```

---

## Next steps

- [Live data](../live/) — endpoints that read from the connectors you just provisioned.
- [Alerts](../alerts/) — rules that fire against live connector data.
- [Security model → Connector credential encryption](../../architecture/security-model/#connector-credential-encryption).
