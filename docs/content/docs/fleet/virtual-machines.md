+++
title = "Virtual Machines"
description = "NQRust MicroVMs — inventory, allocation, and host mapping"
weight = 45
date = 2026-04-23

[extra]
toc = true
+++

The VMs view at `/vm` lists every virtual machine reported by connected NQRust Hypervisor sources. Each row shows allocation, phase, and the host the VM is running on — click through to `/vm/[id]` for per-VM metrics and a direct link back to the hosting node.

> 📸 **Screenshot needed:** `/images/fleet/vms/list.png`
> **Page to capture:** `/vm`
> **What to show:** The VMs table with filter bar, sortable columns (Name, Namespace, Node, Phase, vCPU, Memory), and the status pills for running / pending / stopped / failed.

---

## List View — `/vm`

### Filters

- **Search** — matches name, namespace, node hostname, or connector id
- **Phase** — all / running / pending / stopped / failed / unknown

### Table Columns

| Column | Source | Notes |
|---|---|---|
| **Name** | `name` | Click the row to open the detail |
| **Namespace** | `namespace` | Connector-supplied namespace or workload label |
| **Host** | `node` | Links to `/hosts/[id]` |
| **Status / Phase** | `phase` → `VmStatus` | running / pending / stopped / failed / unknown |
| **vCPU** | `resources.cpuRequestedCores` | Requested vCPU count |
| **Memory** | `resources.memoryRequestedBytes` | Requested bytes, formatted KB/MB/GB |
| **IP** | `ipAddress` | First usable IP advertised by the VM |
| **Uptime** | `uptimeSeconds` | Days + hours for long runners |

Columns are sortable; a diagnostics banner appears when any connector returns partial data.

---

## Detail View — `/vm/[id]`

> 📸 **Screenshot needed:** `/images/fleet/vms/detail.png`
> **Page to capture:** `/vm/[id]`
> **What to show:** The VM detail page with the header (name + phase pill), metric cards for vCPU / memory / uptime / IP, and a "Host" card linking to the hosting node.

The VM id in the URL is a compound `<connectorId>:<namespace>:<name>`. The detail page shows:

- **Header** — VM name, namespace, phase pill, connector badge
- **Resource allocation cards** — requested vCPU, requested memory, actual CPU usage % of request, actual memory usage % of request
- **Network cards** — IP address, Rx/Tx rate, network error rate
- **Uptime & lifecycle** — current phase, uptime, creation timestamp, last restart
- **Host mapping** — a link out to the hosting node (`/hosts/[id]`)

NQRust MicroVM lifecycle state is normalized to the `VmStatus` enum used by the UI.

> 📸 **Screenshot needed:** `/images/fleet/vms/metrics.png`
> **Page to capture:** `/vm/[id]`
> **What to show:** The metric-card grid with vCPU requested/used, Memory requested/used, Network Rx/Tx, and the host drill-down link highlighted.

---

## Host Mapping & Capacity

Hosts reserve VM capacity using a fixed slot model:

| Slot | vCPU | Memory |
|---|---|---|
| **S** | 1 | 2 GiB |
| **M** | 2 | 4 GiB |
| **L** | 4 | 8 GiB |

Each host's detail page reports free slots (S / M / L) alongside the running VM count, so you can tell at a glance how much additional microVM capacity the node has.

{{% alert icon="⚡" context="info" %}}
The VM list joins data from every active NQRust Hypervisor connector into one inventory. Filter by namespace or connector id when needed.
{{% /alert %}}

---

## Data Source

The page calls `/api/live/vm`, which delegates to `fetchLiveVms()` in the domain layer and aggregates NQRust MicroVM inventory from every active `nqrust_hypervisor` connector.

Failures on a single connector return a 502 with a structured error body, which the UI renders as a diagnostics banner at the top of the list.

---

## Related

- [Hosts](../hosts/) — the VM inventory tab on each host detail
- [Connectors](../../connectors/) — add or manage NQRust Hypervisor sources
- [Alerts](../../alerts/) — VM phase and resource thresholds
