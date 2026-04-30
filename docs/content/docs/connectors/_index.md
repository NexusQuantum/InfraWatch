+++
title = "Connectors"
description = "Credentialed links to NQRust Hypervisor metrics sources."
weight = 30
date = 2026-04-23

[extra]
toc = true
+++

A **connector** is a credentialed, encrypted link from InfraWatch to your NQRust Hypervisor metrics endpoint.

> 📸 **Screenshot needed:** `/images/connectors/list.png`
> **Page to capture:** `/connectors`
> **What to show:** Connector list with top status cards and multiple NQRust Hypervisor rows in different health states.

---

## Connector type

InfraWatch currently documents and supports one production connector type:

| Type | Source | What you get |
|---|---|---|
| `nqrust_hypervisor` | NQRust Hypervisor embedded Prometheus | Host metrics, VM inventory, VM-to-host mapping, storage telemetry |

---

## Connector fields

Each connector stores:

- `connectorType` (`nqrust_hypervisor`)
- `baseUrl` (Prometheus-compatible `/api/v1` endpoint)
- Auth material (`none`, `basic`, or `bearer`) encrypted with `CONNECTOR_ENCRYPTION_KEY`
- Namespacing labels: `environment`, `site`, `datacenter`
- TLS setting (`insecureTls`)
- Optional operator notes

---

## Lifecycle

1. Add connector on `/connectors`.
2. Run **Test Connection** (`sum(up)`).
3. Save encrypted connector record to PostgreSQL.
4. Health polling updates status and latency.
5. Live fleet pages consume connector data.

> 📸 **Screenshot needed:** `/images/connectors/add-dialog.png`
> **Page to capture:** `/connectors` (click **Add Connector**)
> **What to show:** Add Connector side-sheet with URL, auth mode, labels, and TLS option visible.

---

## Status values

- `healthy`: base probe and required checks pass
- `degraded`: base probe passes but one or more required checks are missing
- `down`: base probe fails or connector is disabled
- `misconfigured`: fallback legacy status

---

## Sub-pages

- [NQRust Hypervisor](nqrust-hypervisor/) - Hypervisor connector setup and troubleshooting
- [Manage Connectors](manage-connectors/) - Create, edit, test, toggle, and delete connectors

---

## Related

- [Fleet & Monitoring](../fleet/) - where connector data is rendered
- [Alerts](../alerts/) - rule evaluation on live connector data
- [API Reference > Connectors](../api-reference/#connectors) - HTTP contract
