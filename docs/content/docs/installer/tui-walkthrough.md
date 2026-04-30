+++
title = "TUI Walkthrough"
description = "Phase-by-phase tour of the InfraWatch TUI installer with screenshot placeholders"
weight = 95
date = 2026-04-23

[extra]
toc = true
+++

A screen-by-screen tour of `sudo infrawatch-installer install` from first launch to the completion screen. Each phase below shows what the TUI displays, what keys work on that screen, and includes a screenshot placeholder for the real PNG to be captured later.

All screenshots live under `/images/installer/`. The files below are intentionally not present in the repo — drop real captures into `docs/static/images/installer/` to replace the placeholders.

---

## Phase 1 — Welcome

The installer opens with the InfraWatch banner, the version string, and a short summary of what will happen during the install.

> 📸 **Screenshot needed:** `/images/installer/welcome.png`
> **Page to capture:** `infrawatch-installer install` — Welcome phase
> **What to show:** The welcome screen with the InfraWatch ASCII logo in the brand color, the version tag, and the "Press Enter to continue  •  q to quit" key hints at the bottom.

**Keys:** **Enter** to continue, **q** or **Ctrl+C** to abort.

---

## Phase 2 — Mode Select

A list of the three install modes with the highlight on **Full** by default. See [Modes](../modes/) for the semantics of each.

> 📸 **Screenshot needed:** `/images/installer/mode-selection.png`
> **Page to capture:** `infrawatch-installer install` — Mode Select phase
> **What to show:** The three-row list (Full / Minimal / Development) with a one-line description beneath each row. The highlighted row is "Full — PostgreSQL installed, production build, systemd service".

**Keys:** **↑/↓** (or **k**/**j**) to move the selection, **Enter** to confirm, **Esc** to go back to Welcome.

---

## Phase 3 — Configuration

A form where every default is safe. The two fields most users touch are **DB password** and **Admin password**; everything else (install paths, DB host, DB port, HTTP port, admin username) has a sensible default.

Configuration is split across a few focused sub-screens.

### Database port

> 📸 **Screenshot needed:** `/images/installer/configuration-db-port.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (DB port)
> **What to show:** The "Database port" field selected with the default value `5432` visible and the inline edit prompt active.

### Admin user

> 📸 **Screenshot needed:** `/images/installer/configuration-admin-user.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (Admin user)
> **What to show:** The admin username/password fields with the username defaulted to `admin` and a password field showing masked input.

### HTTP port

> 📸 **Screenshot needed:** `/images/installer/configuration-http-port.png`
> **Page to capture:** `infrawatch-installer install` — Configuration (HTTP port)
> **What to show:** The "HTTP port" field with the default value `3001` highlighted and the key hint row showing "e Edit  •  Enter Continue  •  Esc Back".

**Keys:** **↑/↓** to move between fields, **e** or **Space** to edit the selected field (switches to an inline text input), **Enter** to save the edit and continue, **Esc** to cancel an edit or go back to Mode Select.

---

## Phase 4 — Preflight

The installer validates your system before touching anything. Every check is rendered with a status symbol:

- **Green `✓`** — check passed.
- **Yellow `⚠`** — warning. Install can proceed but the operator should note the finding.
- **Red `✗`** — failure. Install cannot continue until the condition is corrected.

> 📸 **Screenshot needed:** `/images/installer/preflight-checks.png`
> **Page to capture:** `infrawatch-installer install` — Preflight phase
> **What to show:** The preflight checklist with a mix of green checks (OS version, sudo access, disk space), one yellow warning (e.g. "RAM is 2GB — minimum supported; 4GB recommended"), and red failures absent. Bottom status line: "All checks passed — Enter to continue".

If any check is red the installer prints a remediation hint, disables **Enter**, and exits cleanly on **q** — nothing has been written to disk.

**Keys:** **Enter** to proceed to Installation (only when no checks are red), **Esc** to go back to Configuration, **q** or **Ctrl+C** to abort.

---

## Phase 5 — Installation

The workhorse phase. The TUI splits into three vertical regions:

1. A progress **gauge** at the top showing overall percentage and `(completed / total)` phase count.
2. A **phase checklist** with per-step status symbols (`○` pending, `◐` in progress, `✓` success, `⚠` warning, `✗` error, `⊘` skipped).
3. A scrollable **log viewer** streaming every operation's output in real time, with timestamps and color-coded levels (`INF`, `OK`, `WRN`, `ERR`).

A background thread runs the installation; the UI stays fully responsive, the spinner keeps animating, and log scroll works throughout.

### Installation in progress

> 📸 **Screenshot needed:** `/images/installer/installation-progress.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase (mid-run)
> **What to show:** The three-pane layout with the overall progress gauge at ~60%, the phase list showing the first few phases as green checks and the current phase (e.g. "Install — Building InfraWatch") spinning in the brand color, and the log pane tailing `bun install` / `next build` output.

### Installation complete (pre-verification)

> 📸 **Screenshot needed:** `/images/installer/installation-progress-complete.png`
> **Page to capture:** `infrawatch-installer install` — Installation phase (all phases complete)
> **What to show:** The progress gauge at 100%, every phase row green-checked, the log pane showing the final "Service started successfully" message, and a bottom hint that reads "Enter to continue to verification".

**Keys:** **↑/↓** to scroll the log pane, **Enter** to continue once every phase is complete, **Ctrl+C** to abort (the installer stops the running phase and exits).

---

## Phase 6 — Verification

A final round of health checks against the running service: HTTP reachability on the configured port, database connection, and systemd service state. Each check retries a few times with backoff because the service needs a moment to finish starting up.

> 📸 **Screenshot needed:** `/images/installer/verification.png`
> **Page to capture:** `infrawatch-installer install` — Verification phase
> **What to show:** A tidy three-row result panel with "HTTP OK — GET /api/health returned 200", "Database OK — SELECT 1 returned 1 row", and "Service active — infrawatch.service (running)" all green. Bottom status line reads "Verification passed — Enter to continue".

If a verification check fails the installer keeps the service installed but surfaces the error with a remediation hint (usually "check `journalctl -u infrawatch -f`") — see [Common Issues](../../troubleshooting/common-issues/).

**Keys:** **Enter** to continue to Complete.

---

## Phase 7 — Complete

The installer prints the access URL, the admin username, and links to the next steps.

> 📸 **Screenshot needed:** `/images/installer/complete-screen.png`
> **Page to capture:** `infrawatch-installer install` — Complete phase
> **What to show:** The completion screen with a large green check, "Installation complete" header, access URL (`http://<host>:3001`), admin username, and the reminder to change the admin password on first login. Key hints at the bottom: "Enter to exit".

**Keys:** **Enter** to exit the installer.

{{% alert icon="⚠️" context="warning" %}}
Change the default admin password immediately after first login via **Settings → Account**, and set a strong `CONNECTOR_ENCRYPTION_KEY` (32+ random characters) in `/opt/infrawatch/.env` before adding any connectors.
{{% /alert %}}

Head to [Getting Started → Quick Start](../../getting-started/quick-start/) to accept the EULA, activate your license, and add your first connector.
