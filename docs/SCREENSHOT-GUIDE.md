# InfraWatch Screenshot Capture Guide

This is the exhaustive checklist of every screenshot placeholder currently present in the documentation. Every entry includes:

- **Target path** — where the PNG must land, relative to `docs/`.
- **Source page** — the URL path (or installer phase) to navigate to in the running InfraWatch app.
- **What to show** — the UI region or state that should be framed.
- **Viewport** — recommended viewport. Default is **1440 x 900** (desktop). Some captures call for a wider or narrower viewport — it is noted inline.

The guide is enumerated by reading the actual `> 📸 Screenshot needed:` blocks across `content/docs/**/*.md`. If you add a new placeholder, regenerate this file.

---

## Conventions

- Upload PNGs to `static/images/<section>/<filename>.png`. The running Hugo site picks them up automatically; no build restart is needed.
- Use **Chrome or Chromium at 100 % zoom**, with a 1x display scale factor. Any scaled HiDPI output that is not an exact pixel multiple will look blurry in the compiled docs.
- Prefer the default desktop viewport of **1440 x 900** unless the entry calls out a wider size (for example wide dashboard grids are easier to read at **1600 x 1000**). TUI captures (the Rust installer) should be taken against an **80-column x 24-row terminal** or **100 x 30** for the progress screens — the guide notes which.
- Remove any secrets before uploading. IPs from private ranges are fine; bearer tokens, license keys, and passwords are not.
- File names are lowercase-hyphenated. Keep the names exactly as listed — the docs hard-code them.

### Workflow per screenshot

1. Start the app locally (`pnpm dev` from the repo root) or point a browser at a staging instance.
2. Resize the browser window (or use Chrome DevTools Device Toolbar) to the viewport listed.
3. Navigate to the source URL; put the UI into the state described under "What to show".
4. Capture using the platform tool of your choice (Flameshot, macOS Screenshot, Chrome DevTools "Capture full size screenshot", Playwright, etc.).
5. Crop to the region described — do not include the browser chrome unless the entry says so (for example the `session-expiry.png` entry calls out the address bar).
6. Save as PNG at the path below, for example `docs/static/images/connectors/list.png`.
7. Hard-refresh the docs (Ctrl+Shift+R) at http://localhost:1313/ and visually verify the placeholder has resolved.

### Total count

**75 screenshots** across 7 sections:

| Section | Count |
|---|---|
| Introduction | 2 |
| Alerts | 10 |
| Connectors | 7 |
| Fleet & Monitoring | 21 |
| Getting Started | 18 |
| TUI Installer | 10 |
| Settings & Admin | 7 |

Sections that currently have **no** screenshot placeholders (text-only):

- Architecture (overview, data-model, security-model)
- API Reference (all pages)
- Installer (overview, modes, sources, non-interactive, uninstall) — only `tui-walkthrough.md` carries captures
- Settings (overview, password, audit-log)
- Troubleshooting (overview, common-issues, logs)
- Table of Contents

If a writer adds captures to these sections later, re-run the enumeration and update the tables below.

---

## Introduction (2)

Target directory: `static/images/introduction/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/introduction/overview-hero.png` | `/` | 1600x1000 | The dashboard first fold with KPI cards, health summary, and live charts visible. |
| 2 | `static/images/introduction/connector-scope.png` | `/connectors` | 1440x900 | Connector list focused on NQRust Hypervisor rows with status and latency visible. |

---

## Alerts (10)

Target directory: `static/images/alerts/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/alerts/overview.png` | `/alerts` | 1440x900 | Split view — rule list on the left, firing alerts on the right, with the bell icon in the top-right header showing a badge count. |
| 2 | `static/images/alerts/rule-list.png` | `/alerts` | 1440x900 | Alert rule list with a few rules of varying severity, the enabled toggle visible on each row, and the **New Rule** button top-right. |
| 3 | `static/images/alerts/create-dialog.png` | `/alerts` (click **New Rule**) | 1440x900 | Empty create-rule dialog with every field visible — name, description, entity type, metric, operator, threshold, duration, severity, enabled. |
| 4 | `static/images/alerts/operator-dropdown.png` | `/alerts` (create-rule dialog, operator open) | 1440x900 | The five operators rendered as `>`, `>=`, `<`, `<=`, `==` in the dropdown. |
| 5 | `static/images/alerts/severity-dropdown.png` | `/alerts` (create-rule dialog, severity open) | 1440x900 | Severity dropdown with `warning` (yellow badge) and `critical` (red badge) options. |
| 6 | `static/images/alerts/preview-panel.png` | `/alerts` (create-rule dialog, form filled) | 1440x900 | The filled form on the left and the rendered alert-message preview card on the right, including severity badge. |
| 7 | `static/images/alerts/firing-list.png` | `/alerts` | 1440x900 | Full-page firing alerts list with rows grouped by severity, showing entity name, message, fired-at relative time, and inline **Ack** / **Resolve** buttons. |
| 8 | `static/images/alerts/firing-bell-badge.png` | Any page (trigger bell panel) | 1440x900 | Header bell icon with a red `3` badge and the slide-out panel expanded to show the three alerts. |
| 9 | `static/images/alerts/firing-filters.png` | `/alerts` (filters applied) | 1440x900 | Filter bar with `state: active`, `severity: critical`, `entity: host` chips applied and a narrowed result set. |
| 10 | `static/images/alerts/firing-history.png` | `/alerts?status=resolved` | 1440x900 | Resolved alerts list showing `fired_at` and `resolved_at` columns with the duration of each incident. |

---

## Connectors (7)

Target directory: `static/images/connectors/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/connectors/list.png` | `/connectors` | 1440x900 | The list with stats cards (Total / Healthy / Degraded / Down), type filter, and a few rows showing different statuses. |
| 2 | `static/images/connectors/add-dialog.png` | `/connectors` (click **Add Connector**) | 1440x900 | The Add Connector side-sheet with all form fields visible. |
| 3 | `static/images/connectors/edit-dialog.png` | `/connectors/{id}` (click **Edit**) | 1440x900 | Edit side-sheet populated with the current connector's values. |
| 4 | `static/images/connectors/row-actions.png` | `/connectors` (hover a row) | 1440x900 | The row-hover state exposing the trash icon and open-details arrow. |
| 5 | `static/images/connectors/delete-confirm.png` | `/connectors` (click delete on a row) | 1440x900 | The native confirm popup over the connector list. |
| 6 | `static/images/connectors/nqrust-hypervisor-add.png` | `/connectors` (Add → NQRust Hypervisor) | 1440x900 | The form pre-filled with the Rancher monitoring proxy URL and bearer auth selected. |
| 7 | `static/images/connectors/nqrust-hypervisor-test-success.png` | `/connectors/{id}` (after **Test**) | 1440x900 | Test Connection succeeded with healthy status and latency shown. |

---

## Fleet & Monitoring (21)

Target directory: `static/images/fleet/` (subfolders per subsection).

### Fleet overview (4)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/overview/hero-kpis.png` | `/` | 1600x1000 | The four KPI cards at the top — Total Clusters, Total Nodes, Total VMs, Total Storage — with their subtitles showing splits (compute/storage, at-risk count, free slots, % used). |
| 2 | `static/images/fleet/overview/fleet-health.png` | `/` | 1600x1000 | The "System Metrics" card with the four progress bars populated, plus the Top Nodes by CPU ranking panel beside it. |
| 3 | `static/images/fleet/overview/alerts-card.png` | `/` | 1440x900 | The yellow warning card listing "Overview query failed", "Resource utilization query failed", or "Partial data detected. Failed connectors: …". |
| 4 | `static/images/fleet/overview/resource-utilization.png` | `/` | 1600x1000 | The Resource Utilization line chart showing CPU and Memory over 24 hours, plus the neighboring Top Nodes by CPU panel. |

### Hosts (5)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/hosts/list.png` | `/hosts` | 1600x1000 | The hosts table with 8 summary KPI cards at the top (Total / Healthy / Warning / Critical / Total vCPU / Avg Rx / Avg Tx / Nodes With Net Errors) and a populated node list below. |
| 2 | `static/images/fleet/hosts/filters.png` | `/hosts` (filters focused) | 1440x900 | The filter bar with the search input focused, Status dropdown open showing Healthy/Warning/Critical/Down, and the Role dropdown visible. |
| 3 | `static/images/fleet/hosts/detail-top.png` | `/hosts/[id]` | 1600x1000 | The top of the detail page — hostname, status pill, IP/OS/role row, and the grid of metric cards (vCPU Count, CPU %, Memory %, Disk %, Node Rx, Node Tx, Network Error Rate, Active Interfaces, Load, Uptime, Disk IO Util, Disk IOPS, Running VMs, Free VM Slots, VM CPU / Memory). |
| 4 | `static/images/fleet/hosts/detail-charts.png` | `/hosts/[id]` | 1600x1000 | The side-by-side CPU and Memory time-series charts over a 1-hour range, followed by the Network Throughput chart (Rx/Tx) directly below. |
| 5 | `static/images/fleet/hosts/detail-disk.png` | `/hosts/[id]` | 1600x1000 | The filesystem table with mountpoint, device, size, used%, and the Disk IO metric cards above it (Disk IO Util, Disk IOPS R/W). |

### Clusters (4)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/clusters/compute-list.png` | `/clusters` | 1600x1000 | The compute-clusters grid with cluster tiles, each showing node count, at-risk badges, average CPU/memory bars, and VM running counts. |
| 2 | `static/images/fleet/clusters/compute-detail.png` | `/clusters/[id]` | 1600x1000 | A compute-cluster detail page showing the cluster summary card at the top, a health matrix of member hosts, and the member-host table below. |
| 3 | `static/images/fleet/clusters/storage-list.png` | `/storage` | 1600x1000 | The storage-clusters page with the Total Storage Capacity breakdown bar at the top and the cluster grid below, each tile showing capacity bar, degraded components, and pool health. |
| 4 | `static/images/fleet/clusters/drilldown.png` | `/clusters/[id]` (hover hostname) | 1440x900 | The member-host table with one row highlighted, and the cursor hovering a hostname showing the `/hosts/[id]` link target. |

### Virtual Machines (3)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/vms/list.png` | `/vm` | 1600x1000 | The VMs table with filter bar, sortable columns (Name, Namespace, Node, Phase, vCPU, Memory), and the status pills for running / pending / stopped / failed. |
| 2 | `static/images/fleet/vms/detail.png` | `/vm/[id]` | 1600x1000 | The VM detail page with the header (name + phase pill), metric cards for vCPU / memory / uptime / IP, and a "Host" card linking to the hosting node. |
| 3 | `static/images/fleet/vms/metrics.png` | `/vm/[id]` | 1600x1000 | The metric-card grid with vCPU requested/used, Memory requested/used, Network Rx/Tx, and the host drill-down link highlighted. |

### Storage (3)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/storage/list.png` | `/storage` | 1600x1000 | The Total Storage Capacity breakdown bar at the top, followed by the grid of storage-cluster tiles with capacity bars, pool-health chips, and degraded-component badges. |
| 2 | `static/images/fleet/storage/detail.png` | `/storage/[id]` | 1600x1000 | The storage cluster header with capacity bar, per-pool capacity breakdown below, and the volume-health chip row (healthy / degraded / faulted counts). |
| 3 | `static/images/fleet/storage/filesystems.png` | `/storage/[id]` | 1440x900 | The filesystem table with mountpoint, host, device, size, used %, and health status for each filesystem in the cluster. |

### Applications (2)

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/fleet/apps/list.png` | `/apps` | 1440x900 | The applications list with summary KPIs (Total / Healthy / Warning / Critical) and a populated app grid showing app name, status dot, instance count, and connector badge. |
| 2 | `static/images/fleet/apps/detail.png` | `/apps/[id]` | 1600x1000 | The application detail page with the header (app name + rolled-up status), an Instances table listing each host/VM source with its status, and live metric cards (requests/s, error rate, latency when available). |

---

## Getting Started (18)

### Installation (7) — installer screens

Target directory: `static/images/installer/`

These are Rust TUI captures. Use an 80x24 terminal for narrow layouts and 100x30 for the progress / verification screens.

| # | Target path | Source phase | Terminal | What to show |
|---|---|---|---|---|
| 1 | `static/images/installer/installer-welcome.png` | `infrawatch-installer install` | 80x24 | The welcome screen banner with InfraWatch branding and the "Press Enter to begin" prompt. |
| 2 | `static/images/installer/installer-mode-select.png` | `infrawatch-installer install` | 80x24 | The three-row list of install modes (Full / Minimal / Development) with the highlight on "Full". |
| 3 | `static/images/installer/installer-configuration.png` | `infrawatch-installer install` | 80x24 | The configuration form with labels for DB host, DB port, DB password, admin username, admin password, and HTTP port. |
| 4 | `static/images/installer/installer-preflight.png` | `infrawatch-installer install` | 80x24 | The preflight checklist with green checkmarks for each passed check and an "All checks passed" summary. |
| 5 | `static/images/installer/installer-progress.png` | `infrawatch-installer install` | 100x30 | The progress view with per-step spinners, completed steps checked off, and the live log tail at the bottom. |
| 6 | `static/images/installer/installer-verification.png` | `infrawatch-installer install` | 100x30 | The verification panel with "HTTP OK", "Database OK", and "Service active" rows. |
| 7 | `static/images/installer/installer-complete.png` | `infrawatch-installer install` | 80x24 | The completion screen showing `http://<host>:3001`, the admin username, and the next-step links. |

### License (3)

Target directory: `static/images/license/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/license/setup-license.png` | `/setup/license` | 1440x900 | The license setup page with the "License Key" tab selected and the `XXXX-XXXX-XXXX-XXXX` input empty and focused. |
| 2 | `static/images/license/activation-success.png` | `/setup/license` (after activate) | 1440x900 | The success panel showing the license status ("active"), customer name, product, expiry date, and activation count (e.g. "2 / 5"). |
| 3 | `static/images/license/setup-offline.png` | `/setup/license` (Offline tab) | 1440x900 | The "Offline File" tab active, with the drag-and-drop upload area and the "Upload & Activate" button disabled until a file is selected. |

### Quick Start (8)

Target directory: `static/images/quick-start/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/quick-start/login-page.png` | `/login` | 1440x900 | The InfraWatch login form with Username and Password fields and the "Sign in" button. |
| 2 | `static/images/quick-start/eula-modal.png` | `/login` (first login) | 1440x900 | The EULA modal with scrollable agreement text, the language selector, the acceptance checkbox, and the "I Accept" button. |
| 3 | `static/images/quick-start/license-setup.png` | `/setup/license` | 1440x900 | The license activation page with the two tabs ("License Key" and "Offline File") and the key input formatted as `XXXX-XXXX-XXXX-XXXX`. |
| 4 | `static/images/quick-start/dashboard-empty.png` | `/` | 1600x1000 | The InfraWatch dashboard with empty fleet cards (0 hosts, 0 clusters, 0 alerts) and the sidebar navigation visible. |
| 5 | `static/images/quick-start/connectors-empty.png` | `/connectors` | 1440x900 | The connectors page in its empty state, showing the "No connectors yet" message and the prominent **Add Connector** button. |
| 6 | `static/images/quick-start/add-connector-dialog.png` | `/connectors` (click **Add Connector**) | 1440x900 | The Add Connector modal with fields: Name, URL, Authentication (none/basic/bearer), and TLS options. |
| 7 | `static/images/quick-start/connector-test-success.png` | `/connectors` (after **Test**) | 1440x900 | The dialog after a successful **Test Connection**, with a green "Connection OK — 42ms" badge and the **Save** button enabled. |
| 8 | `static/images/quick-start/dashboard-populated.png` | `/` | 1600x1000 | The dashboard with populated fleet cards showing host counts, healthy/warning/critical breakdowns, and the "Last updated" timestamp ticking. |

---

## TUI Installer — Walkthrough (10)

Target directory: `static/images/installer/`

These are additional TUI captures referenced from `installer/tui-walkthrough.md`. Some file names overlap with the Getting Started installer screens above — if you have already captured them there, you can symlink or copy to both paths, but the hard-coded references live in the walkthrough page.

| # | Target path | Source phase | Terminal | What to show |
|---|---|---|---|---|
| 1 | `static/images/installer/welcome.png` | `infrawatch-installer install` — Welcome phase | 80x24 | The welcome screen with the InfraWatch ASCII logo in the brand color, the version tag, and the "Press Enter to continue  •  q to quit" key hints at the bottom. |
| 2 | `static/images/installer/mode-selection.png` | `infrawatch-installer install` — Mode Select phase | 80x24 | The three-row list (Full / Minimal / Development) with a one-line description beneath each row. The highlighted row is "Full — PostgreSQL installed, production build, systemd service". |
| 3 | `static/images/installer/configuration-db-port.png` | `infrawatch-installer install` — Configuration (DB port) | 80x24 | The "Database port" field selected with the default value `5432` visible and the inline edit prompt active. |
| 4 | `static/images/installer/configuration-admin-user.png` | `infrawatch-installer install` — Configuration (Admin user) | 80x24 | The admin username/password fields with the username defaulted to `admin` and a password field showing masked input. |
| 5 | `static/images/installer/configuration-http-port.png` | `infrawatch-installer install` — Configuration (HTTP port) | 80x24 | The "HTTP port" field with the default value `3001` highlighted and the key hint row showing "e Edit  •  Enter Continue  •  Esc Back". |
| 6 | `static/images/installer/preflight-checks.png` | `infrawatch-installer install` — Preflight phase | 80x24 | The preflight checklist with a mix of green checks (OS version, sudo access, disk space), one yellow warning (e.g. "RAM is 2GB — minimum supported; 4GB recommended"), and red failures absent. Bottom status line: "All checks passed — Enter to continue". |
| 7 | `static/images/installer/installation-progress.png` | `infrawatch-installer install` — Installation phase (mid-run) | 100x30 | The three-pane layout with the overall progress gauge at ~60%, the phase list showing the first few phases as green checks and the current phase (e.g. "Install — Building InfraWatch") spinning in the brand color, and the log pane tailing `bun install` / `next build` output. |
| 8 | `static/images/installer/installation-progress-complete.png` | `infrawatch-installer install` — Installation phase (all phases complete) | 100x30 | The progress gauge at 100%, every phase row green-checked, the log pane showing the final "Service started successfully" message, and a bottom hint that reads "Enter to continue to verification". |
| 9 | `static/images/installer/verification.png` | `infrawatch-installer install` — Verification phase | 100x30 | A tidy three-row result panel with "HTTP OK — GET /api/health returned 200", "Database OK — SELECT 1 returned 1 row", and "Service active — infrawatch.service (running)" all green. Bottom status line reads "Verification passed — Enter to continue". |
| 10 | `static/images/installer/complete-screen.png` | `infrawatch-installer install` — Complete phase | 80x24 | The completion screen with a large green check, "Installation complete" header, access URL (`http://<host>:3001`), admin username, and the reminder to change the admin password on first login. Key hints at the bottom: "Enter to exit". |

---

## Settings & Admin (7)

### Authentication (3)

Target directory: `static/images/settings/auth/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/settings/auth/login-page.png` | `/login` | 1440x900 | The login form with username and password fields, the "Sign in" button, and (if SSO is enabled) the provider buttons rendered below. |
| 2 | `static/images/settings/auth/session-expiry.png` | `/fleet` (let session expire) | 1440x900 | The automatic redirect to `/login` triggered by `middleware.ts`, with the original URL preserved in the browser address bar. (Include the address bar in this capture.) |
| 3 | `static/images/settings/auth/rate-limit-error.png` | `/login` (trigger 429) | 1440x900 | The toast / inline error reading "Too many login attempts. Try again later." returned with HTTP 429. |

### SSO (4)

Target directory: `static/images/settings/sso/`

| # | Target path | Source page | Viewport | What to show |
|---|---|---|---|---|
| 1 | `static/images/settings/sso/sso-overview.png` | `/settings` | 1440x900 | The two provider cards (SAML and OIDC) with their enable toggles, display-name field, and a "Save" button per provider. |
| 2 | `static/images/settings/sso/sso-saml-form.png` | `/settings` (SAML card expanded) | 1440x900 | The form with IdP SSO URL, IdP issuer, the PEM-paste area for the signing cert, the SP entity ID field, and the "Download SP metadata" link. |
| 3 | `static/images/settings/sso/sso-saml-callback.png` | `/api/auth/sso/saml/callback` (after IdP POST) | 1440x900 | The browser's address bar showing the POST redirect and the subsequent landing on `/` with the admin user signed in. (Include the address bar.) |
| 4 | `static/images/settings/sso/sso-oidc-form.png` | `/settings` (OIDC card expanded) | 1440x900 | The form with Issuer URL, Client ID, Client Secret, scopes, and the Callback URL displayed as a read-only copyable row. |

---

## Re-enumerating

When new screenshots are added to docs, regenerate this guide:

```bash
cd /home/shiro/nexus/InfraWatch/docs
grep -rn 'Screenshot needed' content/
```

For a machine-readable dump keyed by source file:

```bash
for f in $(grep -rl 'Screenshot needed' content/); do
  awk -v file="$f" '
    /Screenshot needed:/ {
      match($0, /`(\/images\/[^`]+)`/, arr); img=arr[1];
      getline l2; match(l2, /`([^`]+)`/, a2); page=a2[1];
      getline l3; sub(/^[> ]*\*\*What to show:\*\*[[:space:]]*/, "", l3); show=l3;
      print file "\t" img "\t" page "\t" show;
    }
  ' "$f"
done
```

That output is the source of truth for the tables above.

---

## Troubleshooting

### PNG doesn't appear after upload

- File path is case-sensitive — `/images/connectors/List.png` will not resolve if the doc references `list.png`.
- Hard-refresh the browser (Ctrl+Shift+R / Cmd+Shift+R).
- If the Hugo server is long-running, touch any `.md` file to kick a reload.

### Blurry captures

- Set display scale to 100 % (not 125/150) before capturing.
- Browser zoom must be 100 %.
- Save as PNG (lossless). JPG introduces artifacts on UI text.

### Compressed but still too big

- Resize to a max width of 1920 px if the capture is full-desktop.
- Run through `pngquant` or https://tinypng.com — 80–85 % quality is invisible to users and ~5x smaller.
