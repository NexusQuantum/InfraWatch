+++
title = "Prometheus Proxy"
description = "Per-connector PromQL instant and range query forwarding, with global concurrency limiting."
weight = 85
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch exposes a thin PromQL forwarder so the UI (and your scripts) can run ad-hoc queries against a NQRust Hypervisor's embedded Prometheus without storing credentials on the client. Both endpoints accept an optional `connectorId` query parameter — omit it to hit the env-default connector (if configured), or pass a specific connector id to pick the target NQRust Hypervisor node.

{{% alert icon="⚡" context="info" %}}
All Prometheus traffic from InfraWatch — live data, alert evaluation, and these proxy endpoints — shares a **global concurrency limit of 20 in-flight queries**. Over that limit, requests queue in-process instead of hammering the upstream. See [Architecture → Prometheus client](../../architecture/#prometheus-client).
{{% /alert %}}

---

## `GET /api/prometheus/query`

Forward a PromQL **instant** query to the selected connector.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Not enforced on this route |
| CSRF | Not required |

### Query parameters

| Param | Required | Description |
|---|---|---|
| `query` | yes | PromQL expression. URL-encode it. |
| `time` | no | RFC 3339 timestamp or Unix epoch. Defaults to "now". |
| `connectorId` | no | Connector UUID. If omitted, the env-default connector is used. |

### Response — 200 OK

Direct pass-through of the NQRust Hypervisor's Prometheus response body:

```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": { "__name__": "up", "job": "node", "instance": "10.0.0.1:9100" },
        "value": [ 1714046400, "1" ]
      }
    ]
  }
}
```

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Missing required query parameter: query" }` | No `query` sent. |
| 404 | `{ "error": "Connector not found or disabled" }` | `connectorId` is invalid or the connector is disabled. |
| 502 | `{ "error": "<upstream error message>" }` | NQRust Hypervisor returned an error or was unreachable. |

### Example

```bash
curl -G "https://infrawatch.example.com/api/prometheus/query" \
  --data-urlencode 'query=up' \
  --data-urlencode 'connectorId=7c1a…'
```

---

## `GET /api/prometheus/query_range`

Forward a PromQL **range** query.

| Attribute | Value |
|---|---|
| Method | `GET` |
| Auth | Not enforced on this route |
| CSRF | Not required |

### Query parameters

| Param | Required | Description |
|---|---|---|
| `query` | yes | PromQL expression. |
| `start` | yes | RFC 3339 timestamp or Unix epoch. |
| `end` | yes | RFC 3339 timestamp or Unix epoch. |
| `step` | yes | Step width, e.g. `15s`, `1m`, `5m`. |
| `connectorId` | no | Connector UUID; env-default if omitted. |

### Response — 200 OK

Pass-through of the NQRust Hypervisor's Prometheus range response:

```json
{
  "status": "success",
  "data": {
    "resultType": "matrix",
    "result": [
      {
        "metric": { "__name__": "node_load1", "instance": "10.0.0.1:9100" },
        "values": [
          [ 1714046400, "0.31" ],
          [ 1714046460, "0.42" ],
          [ 1714046520, "0.38" ]
        ]
      }
    ]
  }
}
```

### Errors

| Status | Body | Meaning |
|---|---|---|
| 400 | `{ "error": "Missing required query parameters: query, start, end, step" }` | Any of the four required params is missing. |
| 404 | `{ "error": "Connector not found or disabled" }` | |
| 502 | `{ "error": "<upstream error>" }` | NQRust Hypervisor unreachable or returned an error. |

### Example

```bash
curl -G "https://infrawatch.example.com/api/prometheus/query_range" \
  --data-urlencode 'query=rate(node_cpu_seconds_total[5m])' \
  --data-urlencode 'start=2026-04-23T11:00:00Z' \
  --data-urlencode 'end=2026-04-23T12:00:00Z' \
  --data-urlencode 'step=1m' \
  --data-urlencode 'connectorId=7c1a…'
```

---

## Concurrency & queuing

- Every outbound query — from these proxy routes, from live endpoints, and from the alert evaluator — goes through a single shared limiter in `lib/prometheus/client.ts`.
- The default ceiling is **20 concurrent in-flight queries globally**.
- Queries above the ceiling are **queued**, not rejected. End-to-end latency increases; no `429` is returned.
- If you need more headroom, raise the limit in source. Before doing so, confirm your NQRust Hypervisor nodes can handle the higher query concurrency.

---

## Error shape reference

Both endpoints return a uniform error body on non-2xx:

```json
{ "error": "Human-readable message" }
```

The following upstream failures map to `502`:

- DNS / connect / TLS errors.
- HTTP 5xx from the NQRust Hypervisor's embedded Prometheus.
- Malformed JSON in the upstream response.
- Timeouts (configurable in `lib/prometheus/client.ts`).

---

## Next steps

- [Connectors](../connectors/) — provision the `connectorId` you will pass here.
- [Live data](../live/) — higher-level endpoints that already compose PromQL into dashboard rows.
- [Architecture → Request path](../../architecture/#request-path).
