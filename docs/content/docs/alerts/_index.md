+++
title = "Alerts"
description = "Threshold-based alert rules with batched evaluation, auto-resolution, and 30-day retention."
weight = 50
date = 2026-04-23

[extra]
toc = true
+++

Alerts let InfraWatch flag unhealthy entities without you having to stare at dashboards. You write **rules** — "fire warning when a host's CPU stays above 90% for 5 minutes" — and the evaluator turns sustained breaches into **firing alerts** with severity, entity context, and a human-readable message.

---

## Rules vs. firing alerts

Two distinct concepts live side by side:

| Concept | What it is | Where it lives | Stored in |
|---|---|---|---|
| **Alert rule** | A reusable condition you write once (`metric + operator + threshold + entity scope`) | `/alert-rules` page, CRUD via `/api/alert-rules` | `alert_rules` table |
| **Firing alert** | A concrete incident triggered when a rule matches a specific entity right now | `/alerts` page and the bell dropdown, read via `/api/alerts` | `alerts` table |

One rule can produce zero, one, or many firing alerts at the same time — one per matching entity. Deleting a rule cascades to its firing alerts (`ON DELETE CASCADE` on `alerts.rule_id`).

---

## How evaluation works

The evaluator in `lib/server/alert-evaluator.ts` runs **at most once per 60 seconds** regardless of how often SWR hooks on the client poll. Invocations that arrive inside that window are dropped on the floor, and a second call that arrives while an evaluation is in flight is also skipped. This keeps database write amplification constant even if twenty dashboards are open.

Each evaluation pass is fully **batched**:

1. Load every enabled rule (one query).
2. Fetch every currently-active or acknowledged alert for those rule IDs (one query, `batchFindActiveAlerts`).
3. Walk the in-memory entity snapshots (hosts, compute clusters, and storage clusters) already fetched by the dashboard, extract the rule's metric from each entity, and compare against the threshold.
4. Collect two lists: alerts that need to be **created** (triggered and no existing active alert) and alerts that need to be **resolved** (no longer triggering but an active alert exists).
5. Execute `batchCreateAlerts` and `batchAutoResolve` in parallel — two queries regardless of fleet size.

Put another way: the number of SQL writes per tick is O(1) in the fleet size and O(1) in the rule count. See [Architecture › Alert pipeline](../architecture/) for the full data flow.

{{% alert icon="⚡" context="info" %}}
Evaluation is triggered lazily from the main dashboard data-loader. If no dashboard is open and no other code path calls `evaluateAlerts()`, no evaluation runs. There is no dedicated background worker — InfraWatch piggy-backs on the request that already fetched the entity snapshots.
{{% /alert %}}

---

## Auto-resolution

Firing alerts resolve themselves as soon as the underlying metric stops breaching the threshold. In each pass the evaluator:

- Builds a `touchedKeys` set of `${ruleId}:${entityId}` pairs it actually looked at.
- Flips every active alert in that set whose metric is no longer triggering to `status = 'resolved'` with `resolved_at = NOW()`.

There is no manual "mark as healthy again" step — a recovered host, cluster, or pod is resolved on the next tick (so within ~60 seconds of recovery). You can still force a resolution manually from the UI for edge cases; see [Manage Firing Alerts](manage-alerts/).

---

## Retention and auto-purge

Resolved alerts are **not kept forever**. `purgeOldAlerts()` runs at the end of every evaluation pass (throttled to once per hour) and deletes rows from the `alerts` table where:

- `status = 'resolved'`, and
- `resolved_at < NOW() - INTERVAL '30 days'`.

Active and acknowledged alerts are never purged — only resolved ones after the 30-day cut-off.

{{% alert icon="⚡" context="warning" %}}
Resolved alerts older than 30 days are automatically purged from the `alerts` table and cannot be recovered. If you need longer-term incident history, export alerts through the API or forward them to an external SIEM before they age out.
{{% /alert %}}

> 📸 **Screenshot needed:** `/images/alerts/overview.png`
> **Page to capture:** `/alerts`
> **What to show:** Split view — rule list on the left, firing alerts on the right, with the bell icon in the top-right header showing a badge count.

---

## Sub-pages

- **[Create an Alert Rule](create-alert-rule/)** — walkthrough of every field on the rule form (metric, operator, threshold, duration, severity, entity scope).
- **[Manage Firing Alerts](manage-alerts/)** — the alerts list, filters, acknowledge/resolve actions, and alert count badge.

---

## Related

- [Connectors](../connectors/) — alerts evaluate against metrics scraped through connectors.
- [Fleet & Monitoring](../fleet/) — where the entity snapshots that feed the evaluator come from.
- [Settings › Authentication](../settings/authentication/) — who is allowed to create and manage alert rules.
