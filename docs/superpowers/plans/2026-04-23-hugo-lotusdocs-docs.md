# InfraWatch Hugo/Lotusdocs Site Implementation Plan

> **Subagents:** Each task below is self-contained. Read the "Shared spec" first, then your task. Do not modify files outside your task's scope.

**Goal:** Stand up a Hugo + Lotus Docs documentation site for InfraWatch, mirroring the structure and conventions of `NexusQuantum/NQRust-MicroVM` (cloned to `/tmp/docs-ref/NQRust-MicroVM`).

**Status:** Foundation (Task 1) is complete — `docs/` directory exists with `hugo.toml`, `hugo.dev.toml`, `hugo.prod.toml`, `go.mod`, `build.sh`, `serve.sh`, `layouts/shortcodes/img.html`, `assets/css/infrawatch-theme.css` (blue), `assets/css/toc-collapse.css`, `assets/js/toc-collapse.js`, `data/landing.yaml`, `archetypes/default.md`, `static/` favicon + logo assets, `content/_index.md`, `content/docs/_index.md`, and a vendored `bin/hugo`. Hugo build currently succeeds.

---

## Shared spec (every content subagent must follow)

### Project context

InfraWatch is an **infrastructure observability dashboard** (Next.js 16 + React 19, PostgreSQL, SWR polling, LRU cache) focused on NQRust Hypervisor connector telemetry in one UI. It ships with a **Rust TUI installer** (Ratatui + Crossterm) and supports online/airgap installs. Authoritative facts live in:

- `/home/shiro/nexus/InfraWatch/README.md` — main product overview, system requirements, installer flags, env vars, connector types, architecture diagram
- `/home/shiro/nexus/InfraWatch/SPECS.md` — deeper product specs
- `/home/shiro/nexus/InfraWatch/building-a-tui-installer.md` — installer phases & design
- `/home/shiro/nexus/InfraWatch/EULA.md` — license terms (Indonesian and English versions exist)
- `/home/shiro/nexus/InfraWatch/LICENSING_TUTOR.md` — licensing system internals
- `/home/shiro/nexus/InfraWatch/app/api/` — route handlers (directory = endpoint; `route.ts` = handlers)
- `/home/shiro/nexus/InfraWatch/app/` — UI pages (`<segment>/page.tsx`, `<segment>/[id]/page.tsx`)

Always base content on the files above. Don't invent features. If a fact isn't in the source, don't include it.

### Reference repo

`/tmp/docs-ref/NQRust-MicroVM/docs/` is the **style reference**. Mirror:

- Frontmatter shape (TOML `+++` blocks with `title`, `description`, `weight`, optional `date`, `[extra] toc = true`)
- Section layout: short intro → `---` separator → sub-sections → troubleshooting / next steps
- Tables for configuration reference
- Alert shortcode: `{{% alert icon="⚡" context="info" %}}…{{% /alert %}}` (contexts: `info`, `success`, `warning`, `danger`)
- Relative links between docs pages: `../quick-start/` style
- Mermaid diagrams inside fenced ` ```mermaid ` blocks when architecture is relevant

### Screenshot placeholders

Since no live InfraWatch instance is available, **do not** invent real screenshot files. Use this exact placeholder format inline where a screenshot would go:

```
> 📸 **Screenshot needed:** `/images/<section>/<filename>.png`
> **Page to capture:** `<URL path inside app, e.g. /connectors>`
> **What to show:** <one-sentence description of the UI region/state>
```

Put placeholders at any point a NQRust-MicroVM doc would show `![…](/images/…)`. Use lowercase-hyphenated filenames under `/images/<section>/`. These need to resolve to nonexistent files — that's intentional so the user can drop real PNGs into `docs/static/images/<section>/` later.

### Frontmatter template

```toml
+++
title = "Page Title"
description = "Short 1-line description used by Lotus Docs cards and meta tags."
weight = 10
date = 2026-04-23

[extra]
toc = true
+++
```

Section `_index.md` files should use `weight` that matches the sidebar order defined below. Sub-page weights start at parent_weight + 1.

### Sidebar / section weights (canonical)

| Weight | Section | Directory |
|---|---|---|
| 10 | Introduction | `content/docs/introduction/` |
| 20 | Getting Started | `content/docs/getting-started/` |
| 30 | Connectors | `content/docs/connectors/` |
| 40 | Fleet & Monitoring | `content/docs/fleet/` |
| 50 | Alerts | `content/docs/alerts/` |
| 60 | Settings & Admin | `content/docs/settings/` |
| 70 | Architecture | `content/docs/architecture/` |
| 80 | API Reference | `content/docs/api-reference/` |
| 90 | TUI Installer | `content/docs/installer/` |
| 100 | Troubleshooting | `content/docs/troubleshooting/` |
| 110 | Table of Contents | `content/docs/table-of-contents/` |

### Don'ts

- Do not touch `hugo.toml`, `hugo.dev.toml`, `hugo.prod.toml`, `data/landing.yaml`, `layouts/`, `assets/`, or `static/` unless the task explicitly requires it.
- Do not create new top-level sections outside the table above.
- Do not install new Hugo modules.
- Do not run `hugo` — the final verification task does that.

---

## Task list

The foundation (Task 1) is done. Task 11 is the final verification pass. Tasks 2–10 are independent content tasks that write to disjoint directories.

Task details live in the dispatch prompts used by each subagent.
