+++
title = "Alerts"
description = "Alert stream and alert-rule CRUD endpoints."
weight = 83
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch exposes two related endpoint families:

- `/api/alerts` — the stream of fired alerts (read, acknowledge, resolve, count).
- `/api/alert-rules` — the thresholds that drive the evaluator.

The evaluator itself is not exposed over HTTP. It runs inline with `/api/live/overview` and self-throttles to once per 60 seconds (see [Architecture → Alert evaluator](../../architecture/#alert-evaluator)).

{{% alert icon="🔐" context="warning" %}}
`/api/alert-rules` endpoints require an authenticated session. The read-only `/api/alerts` and `/api/alerts/count` endpoints do **not** enforce a session in the current implementation — treat them like the live data endpoints.
{{% /alert %}}

---

## `GET /api/alerts`

List alerts with optional filtering and pagination.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Not enforced |
| CSRF | Not required |

### Query parameters

| Param | Type | Description |
|---|---|---|
| `status` | string | `firing`, `acknowledged`, or `resolved`. Omit for all. |
| `severity` | string | `info`, `warning`, or `critical`. |
| `entityType` | string | `host`, `compute_cluster`, `storage_cluster`, … |
| `limit` | integer | Max rows to return. |
| `offset` | integer | Pagination offset. |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": "f2…",
      "ruleId": "3a…",
      "entityType": "host",
      "entityId": "host-42",
      "entityName": "web-02.us-east",
      "severity": "critical",
      "status": "firing",
      "value": 94.2,
      "threshold": 90,
      "firedAt": "2026-04-23T12:00:00.000Z",
      "acknowledgedAt": null,
      "resolvedAt": null,
      "labels": { "environment": "prod", "site": "us-east" }
    }
  ]
}
```

### Errors

| Status | Meaning |
|---|---|
| 500 | Failed to list — see `error` in body. |

### Example

```bash
curl "https://infrawatch.example.com/api/alerts?status=firing&severity=critical&limit=50"
```

---

## `PATCH /api/alerts/[id]`

Acknowledge or resolve a single alert.

| Attribute | Value |
|---|---|
| Method | `PATCH` |
| Auth | Not enforced on this route |
| CSRF | Not required by the handler, but browser callers include it |

### Request body

```json
{ "action": "acknowledge" }
```

Valid `action` values:

- `"acknowledge"` — stamps `acknowledgedAt`, leaves status at `firing` (internally `acknowledged`).
- `"resolve"` — stamps `resolvedAt` and sets status to `resolved`.

### Response — 200 OK

```json
{
  "data": {
    "id": "f2…",
    "status": "acknowledged",
    "acknowledgedAt": "2026-04-23T12:05:00.000Z"
  }
}
```

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Invalid action. Use 'acknowledge' or 'resolve'" }` | Unknown `action`. |
| 404 | `{ "error": "Alert not found or already resolved" }` | |
| 500 | `{ "error": "Failed to update alert" }` | |

### Example

```bash
curl -X PATCH https://infrawatch.example.com/api/alerts/f2… \
  -H 'Content-Type: application/json' \
  -d '{"action":"resolve"}'
```

---

## `GET /api/alerts/count`

Return the count of currently active alerts (firing + acknowledged) for the badge in the app shell.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Not enforced |
| CSRF | Not required |

### Response — 200 OK

```json
{ "data": 7 }
```

### Errors

| Status | Meaning |
|---|---|
| 500 | `{ "error": "Failed to count alerts" }`. |

---

## `GET /api/alert-rules`

List all alert rules.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | **Session required** |
| CSRF | Not required |

### Response — 200 OK

```json
{
  "data": [
    {
      "id": "3a…",
      "name": "Host CPU > 90%",
      "entityType": "host",
      "metric": "cpu_pct",
      "operator": ">",
      "threshold": 90,
      "severity": "critical",
      "enabled": true,
      "scope": { "environment": "prod" },
      "createdAt": "2026-04-20T10:00:00.000Z",
      "updatedAt": "2026-04-20T10:00:00.000Z"
    }
  ]
}
```

### Errors

| Status | Meaning |
|---|---|
| 401 | No session. |
| 500 | Failed to list. |

---

## `POST /api/alert-rules`

Create a new alert rule.

| Attribute | Value |
|---|---|
| Method | `POST` |
| Auth | **Session required** |
| CSRF | **Required** |

### Request body

```json
{
  "name": "Host CPU > 90%",
  "entityType": "host",
  "metric": "cpu_pct",
  "operator": ">",
  "threshold": 90,
  "severity": "critical",
  "enabled": true,
  "scope": { "environment": "prod" }
}
```

### Response — 201 Created

```json
{ "data": { "id": "3a…", "name": "Host CPU > 90%", "…": "…" } }
```

### Errors

| Status | Meaning |
|---|---|
| 400 | Validation failed. |
| 401 | No session. |
| 403 | Missing CSRF token. |

---

## `GET /api/alert-rules/[id]`

Fetch a single rule.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | **Session required** |
| CSRF | Not required |

### Response — 200 OK

Same shape as a list row.

### Errors

| Status | Body |
|---|---|
| 401 | `{ "error": "Authentication required" }` |
| 404 | `{ "error": "Alert rule not found" }` |

---

## `PUT /api/alert-rules/[id]`

Replace fields on an existing rule. The handler uses `PUT` (not `PATCH`) — the body may still be partial; unspecified fields are preserved.

| Attribute | Value |
|---|---|
| Method | `PUT` |
| Auth | **Session required** |
| CSRF | **Required** |

### Request body

Any subset of the create body.

### Response — 200 OK

```json
{ "data": { "id": "3a…", "threshold": 85, "…": "…" } }
```

### Errors

| Status | Meaning |
|---|---|
| 400 | Invalid payload. |
| 401 | No session. |
| 403 | Missing CSRF token. |
| 404 | Rule not found. |

{{% alert icon="⚡" context="info" %}}
`PATCH` is **not** implemented on `/api/alert-rules/[id]`. The UI uses `PUT`.
{{% /alert %}}

---

## `DELETE /api/alert-rules/[id]`

Delete a rule. Historical alerts created by the rule are **not** deleted — the `rule_id` foreign key remains and the UI shows them as orphaned.

| Attribute | Value |
|---|---|
| Method | `DELETE` |
| Auth | **Session required** |
| CSRF | **Required** |

### Response — 200 OK

```json
{ "success": true }
```

### Errors

| Status | Meaning |
|---|---|
| 401 | No session. |
| 403 | Missing CSRF token. |
| 404 | Rule not found. |

---

## Next steps

- [Architecture → Alert evaluator](../../architecture/#alert-evaluator) — how rules fire.
- [Data model → `alerts` / `alert_rules`](../../architecture/data-model/#alerts) — persisted shape.
- [Alerts UI](../../alerts/) — operator view.
