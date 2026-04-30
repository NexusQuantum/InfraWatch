+++
title = "TUI Installer"
description = "The InfraWatch Rust + Ratatui terminal installer — phases, modes, sources, and scripted use"
weight = 90
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# TUI Installer

InfraWatch ships with **`infrawatch-installer`** — a production-grade terminal installer written in **Rust** on top of the **Ratatui** + **Crossterm** stack. It takes a fresh Linux host (Ubuntu 22.04+, Debian 12+, RHEL 9+, Rocky 9+) to a running, systemd-managed InfraWatch instance in a single guided session, online or fully air-gapped.

The installer is a single static `x86_64-unknown-linux-musl` binary with no runtime dependencies. It is shipped as a standalone release asset, bundled inside the self-extracting `.run` airgap archive, and also produced by `cargo build --release` inside the repository's `installer/` directory.

---

## The Seven Phases

Every invocation of `infrawatch-installer install` walks through the same seven-phase state machine. Phases advance only when the previous phase succeeds; failures surface a remediation hint and exit cleanly without leaving a half-installed system behind.

```
Welcome → Mode Select → Configuration → Preflight → Installation → Verification → Complete
```

| # | Phase | What happens |
|---|---|---|
| 1 | **Welcome** | Product banner, version string, and a short summary of what will happen. Press **Enter** to begin. |
| 2 | **Mode Select** | Pick between `Full`, `Minimal`, or `Development`. See [Modes](modes/). |
| 3 | **Configuration** | Review and adjust install paths, database credentials, admin credentials, and HTTP port. Defaults are safe. |
| 4 | **Preflight** | Validate OS version, RAM, disk, required ports, `sudo` access, and (online mode) outbound connectivity. Nothing is written to disk yet. |
| 5 | **Installation** | Provision dependencies, create the database, build InfraWatch, generate `/opt/infrawatch/.env`, and install the `infrawatch.service` systemd unit. Live logs stream in a scrollable pane. |
| 6 | **Verification** | Health-check the running service: HTTP reachability on the configured port, database connection, and systemd service state. |
| 7 | **Complete** | Print the access URL, admin username, and next-step links. |

For a screen-by-screen tour with placeholder images, see the [TUI Walkthrough](tui-walkthrough/).

---

## Architecture

The installer follows a clean three-layer split, all packaged in one binary:

- **State machine (`app.rs`)** — a single `App` struct holds every piece of mutable state: current screen, configuration, phase statuses, log buffer, terminal size. Navigation is a simple `next_screen()` / `prev_screen()` transition.
- **UI layer (`ui/`)** — one render function per screen, plus reusable widgets (`phase_progress`, `log_viewer`, `status_bar`). Renderers are pure: they read `App` and draw; they never mutate state.
- **Installer modules (`installer/`)** — one module per concern: `preflight`, `deps`, `database`, `build`, `config`, `services`, `verify`. Each function returns `Vec<LogEntry>` so operations stay completely decoupled from the UI.

The installation itself runs on a background thread and communicates with the UI through an `mpsc` channel carrying `InstallMessage` variants (`PhaseStart`, `PhaseProgress`, `PhaseComplete`, `Log`, `Error`). This keeps the 100 ms input-polling loop responsive — the spinner animates, the log pane stays scrollable, and `Ctrl+C` works at all times even while `apt-get install` or `bun install` is churning in the background.

{{% alert icon="⚡" context="info" %}}
Every installer operation is **idempotent**. Re-running the installer after an interruption is always safe — user creation, database provisioning, systemd unit installation, and every other step checks "already done?" before acting.
{{% /alert %}}

---

## What the Installer Does (Full Mode)

For a `Full` install on Ubuntu, the installer performs these steps in order:

1. Runs preflight checks (OS, RAM, disk, ports, `sudo`)
2. Installs dependencies (PostgreSQL, Bun runtime) via the detected package manager (`apt-get`, `dnf`, or `yum`)
3. Sets up the database — creates the `infrawatch` user, database, and grants
4. Configures PostgreSQL to listen on the configured `db_port`
5. Clones and builds InfraWatch (`bun install` + `bun --bun next build`)
6. Generates `/opt/infrawatch/.env` with your chosen credentials and a random `CONNECTOR_ENCRYPTION_KEY`
7. Creates and starts the `infrawatch.service` systemd unit
8. Verifies the service responds on the configured HTTP port

See [Modes](modes/) for what changes in `Minimal` and `Development` mode.

---

## Sub-pages

### [Install Modes](modes/)

Choose between `Full`, `Minimal`, and `Development`. Full provisions everything including PostgreSQL and a systemd service; Minimal expects an external database and no systemd unit; Development runs `bun --bun next dev` for hot reload.

### [Install Sources](sources/)

Online (default — clone from GitHub, download Bun, install packages via `apt`/`dnf`) versus `--airgap` (use a pre-built bundle on disk). Covers the self-extracting `.run` archive layout and manual extraction with `--noexec`.

### [Non-Interactive Installs](non-interactive/)

Run the installer from CI, configuration management, or a shell script with `--non-interactive`. Every flag that shapes the install is documented here.

### [Uninstall](uninstall/)

`sudo infrawatch-installer uninstall --force`, plus `--keep-data` and `--keep-database` for non-destructive removal.

### [TUI Walkthrough](tui-walkthrough/)

A phase-by-phase walkthrough with screenshot placeholders for every TUI screen: welcome, mode selection, configuration, preflight checks (green / yellow / red), installation progress, verification, and completion.

---

## Next Steps

Once the installer finishes, head back to [Getting Started → Quick Start](../../getting-started/quick-start/) to accept the EULA, activate your license, and add your first connector. For ongoing operational concerns, see [Troubleshooting](../troubleshooting/).
