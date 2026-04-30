+++
title = "Create an Alert Rule"
description = "Walkthrough of the alert rule form — entity scope, metric, operator, threshold, duration, severity."
weight = 51
date = 2026-04-23

[extra]
toc = true
+++

An alert rule is a reusable condition. Write it once, and the evaluator will check it against every matching entity on every tick. This page walks through each field on the **Create Alert Rule** form and calls out the exact JSON shape the `POST /api/alert-rules` endpoint expects — so what you fill in here maps 1:1 to the row that lands in the `alert_rules` table.

---

## Open the rule list

Navigate to `/alerts` (or click the bell icon in the header and pick **Manage rules**). The rule list shows every row in `alert_rules` ordered by `created_at DESC`, with columns for name, entity type, metric, threshold, severity, and enabled state.

> 📸 **Screenshot needed:** `/images/alerts/rule-list.png`
> **Page to capture:** `/alerts` (rules tab)
> **What to show:** Alert rule list with a few rules of varying severity, the enabled toggle visible on each row, and the **New Rule** button top-right.

Click **New Rule** to open the create dialog.

> 📸 **Screenshot needed:** `/images/alerts/create-dialog.png`
> **Page to capture:** `/alerts` (create modal open)
> **What to show:** Empty create-rule dialog with every field visible — name, description, entity type, metric, operator, threshold, duration, severity, enabled.

---

## Fields

Every field below corresponds to a column in the `alert_rules` table and a key in the `POST /api/alert-rules` JSON body. Field names shown in `monospace` are the exact keys the API expects.

### `name` — required

Short, human-readable title shown in the rule list, in toasts, and in the alert message template. Example: `Host CPU > 90%`.

### `description` — optional

Free-form context. Good place to link a runbook URL or explain *why* this threshold matters. Stored as `description TEXT` and serialized as `string | null`.

### `entityType` — required

The kind of thing the rule applies to. Valid values today (from `lib/server/alert-evaluator.ts`):

| Value | Entity | Notes |
|---|---|---|
| `host` | Physical or VM hosts reported by the NQRust Hypervisor connector | Uses per-host `current.*` fields |
| `compute_cluster` | A logical compute cluster (site + datacenter group) | Uses cluster-wide averages |
| `storage_cluster` | A storage cluster | Uses `capacity.usedPct` |


The dropdown is backed by the same enum the evaluator switches on, so picking a type also filters the list of valid metrics.

{{% alert icon="⚡" context="info" %}}
The task prompt may mention "VM" and "app" entity types. The shipping evaluator does not currently extract metrics for those — the three above are the supported types. If you add a new extractor in `alert-evaluator.ts`, update this table too.
{{% /alert %}}

### `metric` — required

A metric key that the evaluator knows how to extract from the selected entity type. These are **not raw PromQL strings**; they are pre-computed fields on the entity snapshot, derived from NQRust Hypervisor's embedded Prometheus upstream in the connector client. The valid keys per entity type are:

| Entity type | Metric keys |
|---|---|
| `host` | `cpuUsagePct`, `memoryUsagePct`, `diskUsagePct`, `networkErrorRate` |
| `compute_cluster` | `avgCpuUsagePct`, `avgMemoryUsagePct`, `avgDiskUsagePct`, `pressureScore` |
| `storage_cluster` | `storageUsedPct` |


When you fill in the rule form, pick from the dropdown — you are selecting a named field, not writing PromQL.

### `operator` — required

How `actualValue` is compared to `threshold`. The backend accepts five short codes and the UI renders the symbols:

| Code | Symbol | Meaning |
|---|---|---|
| `gt` | `>` | Fire when actual is strictly greater |
| `gte` | `>=` | Fire when actual is greater or equal |
| `lt` | `<` | Fire when actual is strictly less |
| `lte` | `<=` | Fire when actual is less or equal |
| `eq` | `==` | Fire when actual equals threshold |

> 📸 **Screenshot needed:** `/images/alerts/operator-dropdown.png`
> **Page to capture:** `/alerts` (create modal, operator dropdown open)
> **What to show:** The five operators rendered as `>`, `>=`, `<`, `<=`, `==` in the dropdown.

### `threshold` — required

The numeric boundary. Stored as `DOUBLE PRECISION`. Units are whatever the metric carries: percentages for `*UsagePct`, raw counts for `networkErrorRate`, etc. For a "CPU > 90%" rule enter `90`, not `0.9`.

### `durationSeconds` — optional (default `0`)

How long the breach must be sustained before an alert fires. Stored as `INTEGER NOT NULL DEFAULT 0`.

{{% alert icon="⚡" context="info" %}}
`durationSeconds` is persisted on every rule, and the evaluator only fires after the breach has persisted — but because evaluation runs at most once per 60 seconds, the effective resolution of this field is 60-second ticks. A value of `0` means "fire on the first tick where the condition is true".
{{% /alert %}}

### `severity` — required

How bad it is. The `AlertRule.severity` type is `"warning" | "critical"` — both the schema and the evaluator treat this as a two-value field. `critical` alerts get a red badge and count toward the red bell-icon number; `warning` alerts get yellow.

> 📸 **Screenshot needed:** `/images/alerts/severity-dropdown.png`
> **Page to capture:** `/alerts` (create modal, severity dropdown open)
> **What to show:** Severity dropdown with `warning` (yellow badge) and `critical` (red badge) options.

### `enabled` — optional (default `true`)

Disabled rules stay in the table but are filtered out of every evaluation pass (`rules.filter((r) => r.enabled)`). Use this to temporarily silence a noisy rule without losing its configuration.

### `entityFilter` — optional

A `JSONB` column for narrowing the rule to a subset of entities — for example, `{ "site": "eu-west", "connectorId": "conn-abc" }`. The shipping evaluator does not yet apply `entityFilter` client-side; the column is stored and round-tripped so you can populate it now and extend the evaluator later.

---

## Preview before saving

The create dialog includes a preview panel that shows what the fired alert message will look like. The evaluator generates messages with this template:

```
<entityName>: <metric> is <actualValue> (<operatorSymbol> <threshold>)
```

So a rule for `host` / `cpuUsagePct` / `gt` / `90` evaluated against a host named `web-07` at 94.2% CPU produces:

```
web-07: cpuUsagePct is 94.2 (> 90)
```

> 📸 **Screenshot needed:** `/images/alerts/preview-panel.png`
> **Page to capture:** `/alerts` (create modal with all fields filled)
> **What to show:** The filled form on the left and the rendered alert-message preview card on the right, including severity badge.

---

## Save

Click **Create Rule**. The UI calls:

```http
POST /api/alert-rules
Content-Type: application/json
x-csrf-token: <from csrf_token cookie>

{
  "name": "Host CPU > 90%",
  "description": "Runbook: wiki/runbooks/cpu-saturation",
  "entityType": "host",
  "metric": "cpuUsagePct",
  "operator": "gt",
  "threshold": 90,
  "severity": "critical",
  "durationSeconds": 300,
  "enabled": true
}
```

A successful response returns `201 Created` with the rule in `{ data: AlertRule }` shape. The server assigns an ID of the form `rule-<16-hex>` and timestamps `createdAt` / `updatedAt`. The rule is picked up on the next evaluation tick — within 60 seconds.

---

## Editing and deleting

- **Edit** — `PUT /api/alert-rules/<id>` with any subset of the fields above. Omitted fields are left unchanged.
- **Delete** — `DELETE /api/alert-rules/<id>`. Deleting a rule cascades to every firing alert produced by that rule.

Both endpoints require the CSRF header (`x-csrf-token` from the `csrf_token` cookie) and a valid session.

---

## Related

- [Connectors](../connectors/) — the NQRust Hypervisor connector is the source of the metrics your rules compare against.
- [Fleet & Monitoring](../fleet/) — entity snapshots the evaluator reads from.
- [Settings › Authentication](../settings/authentication/) — gate who can create rules.
