# InfraWatch Documentation

This directory contains the source for the InfraWatch documentation site. It is built with [Hugo](https://gohugo.io/) (extended) and the [Lotus Docs](https://lotusdocs.dev/) theme, pulled in as a Hugo Module.

If you have never worked with Hugo before, don't worry — every command you need is in the `serve.sh` / `build.sh` scripts, and the vendored `bin/hugo` binary means you do not need to install Hugo system-wide.

> Catatan singkat: README ini campur English + sedikit Bahasa Indonesia biar enak dibaca tim lokal. Isi dokumentasi resmi tetap English.

---

## Quick Start

### Development server

From the repo root:

```bash
cd docs
bash serve.sh
```

Or with an absolute path:

```bash
bash /home/shiro/nexus/InfraWatch/docs/serve.sh
```

Then open http://localhost:1313/ in your browser. Hugo will live-reload on file save, so edits in `content/` show up instantly.

`serve.sh` sets `PATH` and `GOPATH` for you so Hugo Modules (used to pull the Lotus Docs theme) can resolve correctly. It uses `hugo.dev.toml` under the hood.

### Production build

```bash
bash build.sh
```

This wraps `./bin/hugo --config hugo.prod.toml --minify` and writes the static site to `public/`. Pass `--baseURL https://your.domain/` if you need to override the baseURL baked into `hugo.prod.toml`.

---

## Directory Structure

```
docs/
├── content/              # All documentation pages (Markdown + TOML front-matter)
│   ├── _index.md         # Site homepage
│   └── docs/             # The /docs/... tree (sidebar lives here)
│       ├── introduction/
│       ├── getting-started/
│       ├── connectors/
│       ├── fleet/
│       ├── alerts/
│       ├── settings/
│       ├── architecture/
│       ├── api-reference/
│       ├── installer/
│       ├── troubleshooting/
│       └── table-of-contents/
├── data/                 # YAML data files consumed by layouts (e.g. landing.yaml)
├── layouts/              # Custom Hugo layouts and shortcodes that override the theme
│   └── shortcodes/
│       └── img.html      # Lazy-loading <img> shortcode
├── assets/               # Source assets processed by Hugo Pipes
│   ├── css/
│   │   ├── infrawatch-theme.css   # Blue brand palette
│   │   └── toc-collapse.css       # Collapsible TOC styling
│   └── js/
│       └── toc-collapse.js        # Collapsible TOC behavior
├── static/               # Files served as-is at the site root
│   └── images/           # Screenshot PNGs — see SCREENSHOT-GUIDE.md
├── bin/hugo              # Vendored Hugo extended binary (do not commit edits)
├── hugo.toml             # Base config (shared between dev and prod)
├── hugo.dev.toml         # Dev overrides (loaded by serve.sh)
├── hugo.prod.toml        # Prod overrides (loaded by build.sh)
├── serve.sh              # Start dev server at :1313
└── build.sh              # Build static site to public/
```

Tip: the only files you normally edit are under `content/` and `static/images/`.

---

## Writing Content

### Front-matter template

Every page begins with a TOML front-matter block delimited by `+++`:

```toml
+++
title = "Page Title"
description = "Short 1-line description. Used for meta tags and Lotus Docs cards."
weight = 10
date = 2026-04-23

[extra]
toc = true
+++

# Page body goes here
```

- `title` — shown in the browser tab, sidebar, and page header.
- `description` — used for `<meta name="description">` and listing cards.
- `weight` — controls sort order in the sidebar. Lower = earlier. See "Section weights" below.
- `date` — optional but helps when content has a publication or revision date.
- `[extra] toc = true` — enables the on-page table of contents on the right-hand side.

### Section weights

Sections in the sidebar are ordered by weight:

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

Sub-pages inside a section start at `parent_weight + 1` and go up by 1 per page (for example Getting Started pages use 21, 22, 23 …).

### Alert shortcode

Call out tips, warnings, and success messages with the Lotus Docs `alert` shortcode:

```markdown
{{% alert icon="⚡" context="info" %}}
Use this for general tips and neutral information.
{{% /alert %}}
```

Supported `context` values: `info`, `success`, `warning`, `danger`. Pick whichever icon feels right — emoji is fine.

### Mermaid diagrams

Lotus Docs renders Mermaid from fenced code blocks automatically:

```markdown
​```mermaid
graph TD
  A[User] --> B[Next.js API]
  B --> C[PostgreSQL]
  B --> D[Prometheus Connector]
​```
```

Use Mermaid for architecture, sequence, and state diagrams. Keep node labels short so the diagram is readable on mobile.

### Screenshot placeholders

Because InfraWatch is not running in CI, writers insert a placeholder block where a screenshot will later be dropped in:

```markdown
> 📸 **Screenshot needed:** `/images/<section>/<filename>.png`
> **Page to capture:** `/connectors`
> **What to show:** Empty state with the "Add Connector" button visible.
```

When a real PNG is captured, drop it at `static/images/<section>/<filename>.png` — the placeholder path will resolve automatically. The exhaustive checklist lives in [`SCREENSHOT-GUIDE.md`](./SCREENSHOT-GUIDE.md).

### Images in prose

Once a PNG exists, reference it with Markdown or with the built-in `img` shortcode for lazy loading:

```markdown
![Connectors list](/images/connectors/list.png)

{{< img src="/images/connectors/list.png" alt="Connectors list" class="border rounded" >}}
```

Put PNGs under `static/images/<section>/<filename>.png`. Filenames are lowercase-hyphenated, for example `static/images/connectors/add-connector-wizard-step1.png`.

---

## Adding a New Page

Fastest path: copy an existing page and edit.

1. Pick the section directory, e.g. `content/docs/connectors/`.
2. Copy an existing page: `cp generic-prometheus.md kubernetes-cluster.md`.
3. Update the front-matter: set a new `title`, `description`, and `weight` (use the next free number in that section).
4. Rewrite the body.
5. Save — the running `serve.sh` auto-reloads.
6. If you added a new link target, also update the flat index at `content/docs/table-of-contents/_index.md`.

You can also scaffold via `./bin/hugo new docs/connectors/kubernetes-cluster.md`, which uses the archetype at `archetypes/default.md`.

---

## Adding a New Section

Sections are top-level directories under `content/docs/` with an `_index.md` file.

1. Create the directory: `mkdir content/docs/my-section`.
2. Create the section index at `content/docs/my-section/_index.md`:

   ```toml
   +++
   title = "My Section"
   description = "What this section covers in one sentence."
   weight = 75
   date = 2026-04-23

   [extra]
   toc = true
   +++

   Short intro paragraph that tells the reader what they will find here.
   ```

3. Pick a `weight` that slots your section where you want it in the sidebar (see the table above).
4. Add sub-pages using weights `parent_weight + 1`, `+ 2`, etc.
5. Add your section to `content/docs/table-of-contents/_index.md`.

Do not create sections outside the canonical list without updating the sidebar weight table and the table of contents.

---

## Lotus Docs Features You Get for Free

The theme is already configured in `hugo.toml`, so every page automatically gets:

- **Dark mode** — toggleable in the top bar (`darkMode = true`).
- **Prism syntax highlighting** — with the `lotusdocs` theme (`prism = true`). Supports most languages out of the box; add language hints like `​```ts` or `​```rust` to fenced code blocks.
- **Automatic on-page TOC** — enable per-page with `[extra] toc = true` in front-matter.
- **Scroll-spy** — the right-hand TOC highlights the section currently in view.
- **Responsive layout** — the sidebar collapses into a hamburger menu on small screens.
- **Search** — Lotus Docs ships a client-side search box in the top bar.
- **Google Fonts** — Inter (body) and Fira Code (code) are preloaded via `hugo.toml`.

---

## Where Screenshot PNGs Go

Path convention:

```
static/images/<section>/<filename>.png
```

For example:

- `static/images/connectors/list.png`
- `static/images/fleet/host-detail.png`
- `static/images/installer/tui-welcome.png`

When the running docs reference `/images/connectors/list.png`, Hugo serves it from the `static/` directory above. Use lowercase-hyphenated filenames.

See [`SCREENSHOT-GUIDE.md`](./SCREENSHOT-GUIDE.md) for the complete, section-by-section capture checklist.

---

## Troubleshooting

### `bash serve.sh` fails to resolve Lotus Docs theme

Hugo Modules need Go on `$PATH`. `serve.sh` exports `PATH=/home/shiro/go-binary/bin:$PATH` for you. If your Go binary lives elsewhere, edit the script or set `PATH` yourself before running.

### Port 1313 already in use

Either stop the other Hugo instance, or change the port:

```bash
./bin/hugo server --config hugo.dev.toml --port 1314
```

### Changes to `static/` do not show

Hugo watches `static/` but some browsers cache aggressively. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R).

### `public/` contains stale files

Delete it and rebuild:

```bash
rm -rf public/
bash build.sh
```

---

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Hugo Modules](https://gohugo.io/hugo-modules/)
- [Lotus Docs Guide](https://lotusdocs.dev/docs/)
- [Lotus Docs Shortcodes](https://lotusdocs.dev/docs/shortcodes/)
- [Markdown Guide](https://www.markdownguide.org/)
- [Mermaid Syntax](https://mermaid.js.org/intro/)

Happy writing. Kalau ada pertanyaan, tanya di channel internal atau buka issue di repo utama.
