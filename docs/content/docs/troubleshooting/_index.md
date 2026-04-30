+++
title = "Troubleshooting"
description = "Diagnose service, database, connector, license, alerting, and installer issues"
weight = 100
date = 2026-04-23
sort_by = "weight"
template = "section.html"
page_template = "page.html"

[extra]
toc = true
+++

# Troubleshooting

When InfraWatch misbehaves, almost every issue falls into one of four buckets: the **service itself** isn't running, the **database** is unreachable, a **connector** can't fetch metrics, or the **license** middleware is rejecting requests. This section walks through the common failure signatures for each bucket with a **Symptom / Cause / Fix** format you can scan quickly during an incident.

Before anything else, grab the current state with these two commands — they answer at least half of the questions below:

```bash
sudo systemctl status infrawatch
sudo journalctl -u infrawatch -f
```

---

## Sub-pages

### [Common Issues](common-issues/)

The curated list of failure modes we see most often — systemd failures, PostgreSQL connection errors, connector test failures, license-middleware 403s, empty charts, CSRF rejections, port conflicts, and airgap-bundle mistakes. Each one is written as **Symptom → Cause → Fix** so you can skim in the middle of an outage.

### [Logs](logs/)

Where the logs actually live: `journalctl -u infrawatch -f` for the service, `/var/log/infrawatch/` for installer-created files, the Next.js application logs, and the installer's own log file.

---

## Related Sections

- [Installer](../installer/) — for installer-specific phases and uninstall options.
- [Getting Started → Installation](../getting-started/installation/) — system requirements and post-install checks.
- [Connectors](../connectors/) — for connector configuration (URL, auth, TLS).
- [Alerts](../alerts/) — for alert rule semantics and the 60-second evaluation cadence.
