+++
title = "Logs"
description = "Where InfraWatch service logs, installer logs, and Next.js application logs live"
weight = 102
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch writes diagnostic output to four places. When triaging an incident, start with the systemd journal for the service, then widen the search as needed.

---

## 1. Service Logs (systemd / journald)

The `infrawatch.service` unit streams all application output to the systemd journal. This is the primary log source for anything the Next.js app does at runtime — requests, database errors, alert evaluations, license checks.

Follow the live log:

```bash
sudo journalctl -u infrawatch -f
```

Get the last 100 lines without following:

```bash
sudo journalctl -u infrawatch -n 100 --no-pager
```

Dump the last 500 lines to a file for sharing:

```bash
sudo journalctl -u infrawatch -n 500 --no-pager > /tmp/infrawatch.log
```

Filter by time range:

```bash
sudo journalctl -u infrawatch --since "1 hour ago"
sudo journalctl -u infrawatch --since "2026-04-23 09:00" --until "2026-04-23 10:00"
```

---

## 2. Installer-Created Log Directory — `/var/log/infrawatch/`

The installer can create `/var/log/infrawatch/` for application-level log files if the environment is configured to write outside the journal. This directory is not guaranteed on every install — it exists only when the installer or your own configuration set up file-based logging.

```bash
ls -la /var/log/infrawatch/
sudo tail -f /var/log/infrawatch/*.log
```

If the directory is absent, everything is going to the journal instead (see above).

---

## 3. Next.js Application Logs

The Next.js App Router logs (request handling, server components, API routes) are emitted to stdout by the `bun --bun next start` process that the systemd unit launches. Because they are stdout, they land in the systemd journal alongside the rest of the service output:

```bash
sudo journalctl -u infrawatch -f
```

If you are running InfraWatch in `Minimal` or `Development` mode without the installer-managed systemd unit, the logs stream to the terminal where you launched the app. Capture them with shell redirection or your own process supervisor.

---

## 4. Installer's Own Log File

The `infrawatch-installer` binary keeps its own log of every phase, command, and output. This is the file to grab when an install or uninstall misbehaves.

When running the TUI, every operation is shown live in the scrollable log pane and mirrored to disk. Check the installer output and the standard system log locations on failure:

```bash
# Re-run the installer with the full log visible
sudo infrawatch-installer install 2>&1 | tee /tmp/infrawatch-installer.log
```

For uninstall:

```bash
sudo infrawatch-installer uninstall --force 2>&1 | tee /tmp/infrawatch-uninstall.log
```

---

## Quick Triage Commands

```bash
# Service running?
sudo systemctl status infrawatch

# Service logs (follow)
sudo journalctl -u infrawatch -f

# PostgreSQL running?
sudo systemctl status postgresql

# Is the port listening?
sudo ss -tlnp | grep 3001

# Recent errors only
sudo journalctl -u infrawatch -p err -n 100 --no-pager
```

For how to interpret common failure signatures, see [Common Issues](../common-issues/).
