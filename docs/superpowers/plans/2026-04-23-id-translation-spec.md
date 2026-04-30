# Indonesian Translation Spec for InfraWatch Docs

> **Subagents:** read this entire file before touching any content. Every file under `content/docs/` must get a sibling under `content/id/docs/` with the exact same filename, frontmatter shape, and structural layout. Only prose gets translated.

## Scope

Target: produce an Indonesian (Bahasa Indonesia) mirror of every English page at `/home/shiro/nexus/InfraWatch/docs/content/docs/**/*.md` — plus the landing page at `content/_index.md` — under `content/id/**`.

The Hugo config (`hugo.toml`) already declares the `id` language with `contentDir = 'content/id'`, so any file you drop in there is automatically served at the `/id/…` URL prefix (via Hugo's multilingual routing).

## File mapping rule

Always mirror 1:1:

```
content/docs/<section>/<file>.md           →  content/id/docs/<section>/<file>.md
content/docs/<section>/_index.md           →  content/id/docs/<section>/_index.md
content/docs/_index.md                     →  content/id/docs/_index.md
content/_index.md                          →  content/id/_index.md
```

## What to translate

**Translate:**
- Frontmatter `title` and `description` values.
- All paragraph prose.
- Table column headers and cell text (human-readable content only).
- Headings (`#`, `##`, `###`, etc.).
- List item text.
- `{{% alert %}}` shortcode body text.
- Screenshot placeholder **descriptions only** — the `**What to show:**` line.
- Image `alt` attributes.
- Button labels referenced in prose (e.g. "Click **Next**" → "Klik **Selanjutnya**") — but keep UI labels that exactly match English UI strings in English, inside backticks, when the user must click a real English button. Use judgment: when the app's UI is literally "Create VM", keep `**Create VM**` and add a gloss like "(Buat VM)" if helpful.

**Do NOT translate:**
- File paths, directory names, env var names (`DATABASE_URL`, `LICENSE_PUBLIC_KEY`, etc.).
- Code blocks — leave every ` ``` ` block as-is, including bash, json, sql, yaml, toml, typescript.
- Inline code (`` `text` ``) — never translate anything inside backticks.
- URLs, API routes (`/api/connectors`), HTTP verbs, JSON keys, TOML keys.
- Hugo shortcode names/params: `{{% alert icon="⚡" context="info" %}}` stays exactly — only the inner prose is translated. `{{% /alert %}}` stays as-is.
- Frontmatter keys (`title`, `description`, `weight`, `date`, `[extra]`, `toc`) — keep the keys; translate only the string values on the right of `=`.
- Weights, dates, `layout`, `icon` values — unchanged.
- Mermaid diagram node labels that are technical names (Prometheus, Next.js, PostgreSQL). Translate only descriptive free text inside Mermaid (e.g. edge labels like `"SQL"` stay, but something like `"Real-time Terminal"` could become `"Terminal Real-time"`).
- The relative link paths themselves (`../connectors/`) — Hugo resolves `id` ↔ `en` translations automatically via filename mirror.
- Section identifiers, anchor slugs (`#create-an-alert-rule`) — Hugo auto-generates these from the translated heading; leave any explicit `{#id}` anchors unchanged.
- Screenshot placeholder fields **other than description**: keep `/images/<section>/<file>.png` target paths and the `**Page to capture:**` URL as-is. Translate the `**What to show:**` line only.
- The labels `📸 **Screenshot needed:**`, `**Page to capture:**`, `**What to show:**` — keep them English so the screenshot checklist stays consistent across languages.

## Style guidelines

- Use formal Bahasa Indonesia (not slang, not SMS-speak). Treat the reader as a professional sysadmin / developer.
- Prefer "Anda" rather than "kamu".
- Keep technical English terms that lack a common Indonesian equivalent: **connector**, **dashboard**, **cluster**, **host**, **endpoint**, **session**, **rate limit**, **grace period**, **alert**, **metric**, **quota**, **rollup**, **snapshot**, **feature flag**. Italicize on first use only if it feels natural. Don't force clumsy translations like "pemantau" for "monitor" — use "monitor" directly.
- Translate high-level product terms naturally:
  - "Overview" → "Ringkasan"
  - "Getting Started" → "Memulai"
  - "Fleet & Monitoring" → "Fleet & Monitoring" (keep as-is, it's a product section name)
  - "Settings" → "Pengaturan"
  - "Architecture" → "Arsitektur"
  - "Troubleshooting" → "Pemecahan Masalah"
  - "Table of Contents" → "Daftar Isi"
  - "Installation" → "Instalasi"
  - "Quick Start" → "Mulai Cepat"
  - "License Activation" → "Aktivasi Lisensi"
  - "Authentication" → "Autentikasi"
  - "Audit Log" → "Log Audit"
- Imperatives: "Click", "Run", "Open" → "Klik", "Jalankan", "Buka".
- "Must" / "should" → "harus" / "sebaiknya".
- Keep the shared-spec screenshot/alert conventions intact.

## Frontmatter pattern

Same keys, same weights, same dates. Translate only `title` and `description`. Example:

English source:
```toml
+++
title = "Installation"
description = "Install InfraWatch using the online or airgapped installer"
weight = 21
date = 2026-04-23

[extra]
toc = true
+++
```

Indonesian target:
```toml
+++
title = "Instalasi"
description = "Memasang InfraWatch menggunakan installer online atau airgap"
weight = 21
date = 2026-04-23

[extra]
toc = true
+++
```

## Reference

- The NQRust-MicroVM docs repo at `/tmp/docs-ref/NQRust-MicroVM/docs/content/id/` is a complete working example of this exact structure/style — inspect any file there for tone and formatting.
- Look especially at `/tmp/docs-ref/NQRust-MicroVM/docs/content/id/docs/getting-started/installation.md` as a shape reference for long technical pages.

## Don'ts

- Do not create new English files or modify existing English files. All writes go under `content/id/`.
- Do not change the landing `data/landing.yaml` (it's shared between languages).
- Do not run Hugo — the final verification task does that.
- Do not invent features not already in the English source.
