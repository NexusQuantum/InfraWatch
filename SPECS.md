Here is a concrete planning document for the dashboard app.

## Product goal

Build an internal observability dashboard app in **Next.js 16 + React 19 + Tailwind CSS v4** for a datacenter environment, with:

* UI-based management ([Tailwind CSS][1])boards that work across **multiple servers, clusters, and apps**
* light customization without becoming a full Grafana clone
* simple authentication with a single **admin** user
* room to add more data sources later

Next.js 16 supports the App Router and Route Handlers for building server-side endpoints inside the app, React 19 is the current major line, and Tailwind v4 is the modern version but is designed for modern browsers. ([Next.js][2])duct shape

This should be a **custom observability app**, not a dashboard builder first.

That means:

* opinionated data model
* curated dashboards
* filterable views
* saved dashboard definitions
* configurable connectors
* basic admin settings

Do **not** start by trying to let users build arbitrary drag-and-drop dashboards. That would push you toward rebuilding too much of Grafana too early.

## Recommended scope for v1

### Core v1 capabilities

* login page for one admin user
* connector management UI for multiple Prometheus instances
* connector health test
* unified dashboard views across instances
* filters for:

  * connector / environment
  * cluster
  * server / node
  * app / service
  * time range
* panel types:

  * stat
  * time series
  * table
  * top N
* saved dashboards
* light customization:

  * show/hide panels
  * choose default filters
  * reorder panels within fixed layout regions
  * save dashboard presets

### Not in v1

* arbitrary visual builder
* multi-user RBAC
* alert authoring
* full plugin system
* per-user preferences
* browser-side direct PromQL

# 2) Main architectural decision

## Recommended architecture

**Frontend**

* Next.js App Router
* React Server Components by default
* Client Components only where interactivity is needed

**Backend inside the same app**

* Next.js Route Handlers for internal API endpoints
* server-only connector clients
* query orchestration layer
* caching layer
* auth/session layer

**Storage**

* relational database for app config
* optional Redis for cache and rate control

**Data sources**

* Prometheus as primary source
* Grafana optional later for metadata, annotations, or datasource registry

Next.js documents Route Handlers as the built-in way to create request handlers in the App Router. React Server Components are part of the modern React model and fit this server-heavy dashboard pattern well. ([Next.js][3])his is the right shape

It gives you:

* one deployable app
* clean separation between UI and metric querying
* no CORS pain
* no Prometheus credentials in the browser
* better control over query cost and caching

# 3) Product modules

## A. Authentication

Simple single-admin authentication.

### v1 recommendation

Use:

* one admin account
* hashed password in DB or env-backed bootstrap
* session cookie
* protected app routes
* logout

Next.js’s authentication guidance recommends thinking clearly about authentication, session management, and route protection. ([Next.js][4])ested implementation

* login form posts to `/api/auth/login`
* server validates credentials
* issue signed, httpOnly session cookie
* middleware or layout guard protects `/app/(protected)`
* one admin row in DB

### Good enough for v1

* email/username + password
* bcrypt/argon2 hashed password
* session expiry
* CSRF-safe form handling
* optional IP allowlist later

## B. Connector management

This is one of the most important parts.

### Goal

Allow the admin to connect and manage multiple Prometheus instances from the UI.

### Connector fields

Each Prometheus connector should store:

* id
* name
* base URL
* environment
* region / datacenter
* auth type
* auth secret reference
* scrape timeout override
* query timeout
* enabled/disabled
* TLS options
* health status
* labels/tags

### Supported auth modes

For v1:

* none
* basic auth
* bearer token

Later:

* mTLS
* custom headers
* reverse proxy mode

### Connector UI

Need pages for:

* list all connectors
* add connector
* edit connector
* test connector
* disable connector
* view metrics metadata summary

### Test connector action

Should verify:

* can reach target
* auth works
* Prometheus API responds
* labels endpoint works
* optional sample query works

Prometheus exposes the stable API under `/api/v1`, including query and label discovery endpoints, which makes connector testing straightforward. ([Next.js][3])shboard engine
You are not using Grafana dashboards, so define your own dashboard model.

### Dashboard types in v1

1. **Global overview**
2. **Cluster view**
3. **Server / node view**
4. **App / service view**
5. **Custom saved dashboard**

### Dashboard definition

Each dashboard should have:

* id
* slug
* title
* description
* category
* layout schema
* filter schema
* panel definitions
* refresh interval
* default time range
* visibility flag

### Panel definition

Each panel should include:

* id
* title
* type
* description
* datasource strategy
* query template
* transform rules
* thresholds
* unit
* legend config
* supported filters
* size/layout slot
* empty/error state text

## D. Query layer

This is the heart of the app.

### Responsibilities

* resolve filters into concrete query parameters
* choose one or many connectors
* build PromQL safely
* query Prometheus
* normalize response
* cache results
* return chart/table-friendly JSON

### Important rule

The browser should never send raw free-form PromQL directly for execution.

Instead:

* use predefined panel query templates
* allow only safe variable substitution
* validate values against allowed labels or enumerations
* bound time range and step

That keeps the system predictable and protects Prometheus from expensive abuse.

## E. Customization layer

Since you want “a bit customizable,” keep it controlled.

### v1 customization

Allow:

* panel visibility toggles
* layout presets
* custom dashboard clones from templates
* saved filter presets
* dashboard favorites
* dashboard refresh interval setting
* theme choice

Do not allow:

* arbitrary chart grammar
* arbitrary nested formulas
* unrestricted custom datasource scripting

# 4) Data model

Use PostgreSQL for simplicity and reliability.

## Core tables

### `users`

* id
* username
* password_hash
* role
* created_at
* updated_at

### `sessions`

* id
* user_id
* session_token_hash
* expires_at
* created_at
* last_seen_at

### `connectors`

* id
* name
* type (`prometheus`)
* base_url
* auth_type
* encrypted_secret_ref or encrypted_secret
* environment
* region
* datacenter
* is_enabled
* timeout_ms
* tls_skip_verify
* created_at
* updated_at

### `connector_health`

* id
* connector_id
* status
* latency_ms
* checked_at
* error_message

### `dashboards`

* id
* slug
* title
* description
* kind (`system`, `template`, `custom`)
* schema_json
* created_at
* updated_at

### `dashboard_presets`

* id
* dashboard_id
* name
* filters_json
* layout_overrides_json
* refresh_seconds

### `saved_views`

* id
* dashboard_id
* name
* filters_json
* panel_visibility_json
* created_at

### `query_audit`

* id
* connector_id
* dashboard_id
* panel_id
* query_hash
* duration_ms
* result_status
* requested_at

# 5) Filtering model for multi server / multi cluster / multi app

This is the key product requirement.

## Common dimensions

Define a normalized filter model across connectors:

* connector
* environment
* datacenter
* cluster
* namespace
* app / service
* node / server
* instance
* job
* region
* time range

### Problem you must solve

Different Prometheus instances may use different label names.

For example:

* one uses `cluster`
* another uses `kubernetes_cluster`
* another uses `dc_cluster`

## Solution: label mapping layer

Each connector should have a mapping config like:

* canonical `cluster` -> actual label `cluster`
* canonical `server` -> actual label `instance`
* canonical `app` -> actual label `app` or `service`

This lets your dashboard engine use one canonical filter language.

### Recommendation

Treat canonical fields as:

* `cluster`
* `node`
* `app`
* `namespace`
* `job`
* `instance`

and map per connector.

# 6) Query strategy

## Prometheus endpoints to use

Mainly:

* instant query for stat cards
* range query for time series
* labels and label values for filter dropdowns
* series discovery for advanced filter resolution
* metadata endpoints for nicer metric docs and query introspection

Prometheus documents the HTTP API and its query/discovery endpoints for these uses. ([Next.js][3]) orchestration modes

### Mode 1: single connector

User picks one Prometheus instance.

Use when:

* debugging
* environment-specific view
* exact data isolation needed

### Mode 2: fan-out multi-connector

App queries several Prometheus instances and merges results.

Use when:

* global fleet overview
* multi-datacenter summary
* cross-cluster aggregation

### Recommendation

Support both in v1.

## Merge strategy

For fan-out queries:

* execute same query template per connector
* add connector identity in normalized result metadata
* merge time series by canonical dimensions
* for stat summaries, compute total/avg/max as configured per panel

Be careful with totals across heterogeneous environments. Some panels should aggregate; others should show grouped comparison only.

# 7) App information architecture

## Route structure

```text
/app
  /login
  /(protected)
    /overview
    /connectors
    /connectors/new
    /connectors/[id]
    /dashboards
    /dashboards/[slug]
    /dashboards/[slug]/edit
    /servers
    /clusters
    /apps
    /settings
```

## Navigation

Left sidebar:

* Overview
* Dashboards
* Clusters
* Servers
* Apps
* Connectors
* Settings

Top bar:

* global filters
* time range
* refresh selector
* search
* user menu

# 8) UI planning

## Design direction

A clean ops UI, not flashy:

* dense but readable
* excellent filtering
* fast panel refresh
* strong empty/loading/error states
* easy comparison between cluster/server/app scopes

## Layout

### Main shell

* left sidebar
* top filter bar
* content grid
* right-side optional detail drawer later

### Dashboard page

* title row
* saved preset selector
* filter chips
* panel grid
* panel actions menu

### Connector pages

* connector list with status badges
* “test” action
* recent latency
* last error
* add/edit forms

## Panel system

Start with fixed supported panels:

* stat
* line/time series
* area time series
* stacked breakdown
* top N bar
* table
* health matrix later

# 9) Tech stack recommendation

## Required stack

* Next.js 16
* React 19
* Tailwind CSS v4
* TypeScript
* PostgreSQL
* Prisma or Drizzle
* Zod
* Recharts, ECharts, or uPlot

## My preference

* **Drizzle** for simpler SQL-shaped control
* **Zod** for request/config validation
* **ECharts** if you want strong ops dashboard visuals
* **uPlot** if you want raw performance for large time-series panels

## Tailwind note

Tailwind v4 is tuned for modern browsers; the official docs note modern browser expectations and compatibility considerations. That matters if your internal users are on older enterprise browsers. ([Tailwind CSS][1])rver-side code modules

## Suggested internal packages / folders

```text
/src
  /app
  /components
  /features
    /auth
    /connectors
    /dashboards
    /filters
    /panels
    /servers
    /clusters
    /apps
  /lib
    /auth
    /db
    /cache
    /prometheus
    /query-engine
    /security
    /utils
  /types
```

## Important service layers

### `lib/prometheus/client.ts`

* connector-aware HTTP client
* auth injection
* timeout handling
* retry policy
* TLS config

### `lib/prometheus/api.ts`

* `instantQuery`
* `rangeQuery`
* `labelValues`
* `series`
* `metadata`

### `lib/query-engine/`

* dashboard query compiler
* variable resolver
* fan-out execution
* result merger
* transformations
* cache key generator

### `lib/auth/`

* login
* session cookie helpers
* route guard
* password hashing
* admin bootstrap

# 11) Security plan

Since one admin is okay, keep it simple but correct.

## Minimum security requirements

* httpOnly secure session cookies
* hashed passwords
* encrypted connector secrets
* server-only connector access
* audit trail for connector changes
* request validation on every write endpoint
* rate limiting on login
* CSRF protection for auth and settings changes

## Important

Never expose:

* Prometheus URLs with embedded credentials
* bearer tokens to client components
* raw secret values in edit pages after save

# 12) Caching and performance

## What to cache

* label values
* metadata
* dashboard definitions
* panel query results for short TTL
* connector health

## Good TTL defaults

* labels: 5–15 min
* metadata: 15–60 min
* dashboard panel query results: 15–60 sec
* connector health: 30–60 sec

## Query limits

Enforce:

* max time range
* min step per range
* per-panel timeout
* per-request connector count cap
* panel concurrency cap

This matters a lot once you fan out across many Prometheus servers.

# 13) Observability of the dashboard app itself

You are building an observability app, so instrument it too.

Track:

* request latency
* query latency per connector
* cache hit rate
* login attempts
* failed connector tests
* panel render failures
* fan-out query error rate

Ideally expose your own `/metrics` endpoint later.

# 14) Delivery phases

## Phase 0 — foundation

* initialize Next.js 16 app
* Tailwind v4 setup
* DB schema
* auth
* app shell
* protected routes

## Phase 1 — connectors

* connector CRUD
* test connector
* health status
* secret storage
* label mapping config

## Phase 2 — dashboard engine

* dashboard schema
* panel schema
* query engine
* Prometheus adapter
* result normalization

## Phase 3 — core dashboards

* overview
* clusters
* servers
* apps
* saved presets

## Phase 4 — customization

* clone dashboard
* hide/show panels
* preset saving
* layout preferences

## Phase 5 — hardening

* cache
* audit logs
* rate limits
* better empty states
* export/share links
* internal metrics for the app

# 15) Recommended v1 dashboards

## Overview dashboard

Purpose:

* answer “is the fleet healthy?”

Panels:

* active connectors
* total healthy targets
* CPU usage summary
* memory usage summary
* network errors trend
* top unhealthy nodes
* cluster health table

## Cluster dashboard

Purpose:

* compare clusters

Filters:

* connector
* cluster
* time range

Panels:

* node count
* CPU/memory trend
* pod/service or workload trend if relevant
* top apps by CPU
* top apps by memory
* cluster incident table

## Server dashboard

Purpose:

* troubleshoot a node/server

Filters:

* connector
* cluster
* server

Panels:

* CPU
* memory
* disk
* network
* process/service status
* recent anomalies/events later

## App dashboard

Purpose:

* inspect one application across environments/clusters

Filters:

* app
* cluster
* connector
* namespace
* time range

Panels:

* request rate
* error rate
* latency
* CPU/memory
* instance count
* top noisy instances

# 16) Risks and design traps

## Risk 1: label inconsistency across Prometheus instances

Mitigation:

* per-connector label mappings
* canonical filter system

## Risk 2: too much dashboard freedom

Mitigation:

* fixed supported panel/query schema first

## Risk 3: Prometheus overload from fan-out

Mitigation:

* caching
* concurrency control
* bounded query windows
* panel refresh limits

## Risk 4: auth grows later

Mitigation:

* keep auth abstraction clean so single-admin can later become multi-user

## Risk 5: internal browser support

Mitigation:

* validate Tailwind v4/browser compatibility early because Tailwind v4 is optimized for modern browsers. ([Tailwind CSS][1]) recommended MVP cut

If you want the fastest useful version, build exactly this:

### MVP

* one admin login
* Prometheus connector CRUD
* connector test button
* overview dashboard
* cluster dashboard
* server dashboard
* app dashboard
* global filters
* saved presets
* short-term caching

### Delay

* arbitrary custom panel builder
* Grafana integration
* alert editing
* multi-user support

# 18) Final recommendation

Build this as:

**a server-first Next.js observability app with a controlled dashboard engine and Prometheus fan-out query layer**

That gives you:

* easy multi-Prometheus management
* multi-server / multi-cluster / multi-app dashboards
* light customization
* simple admin auth
* a clean path to production

If you want, I can turn this into the next layer: a **full technical spec** with:

* exact database schema
* API route list
* TypeScript types
* dashboard JSON schema
* connector test flow
* MVP task breakdown by sprint

[1]: https://tailwindcss.com/docs/upgrade-guide?utm_source=chatgpt.com "Upgrade guide - Getting started"
[2]: https://nextjs.org/docs/app?utm_source=chatgpt.com "Next.js Docs: App Router"
[3]: https://nextjs.org/docs/app/getting-started/route-handlers?utm_source=chatgpt.com "Getting Started: Route Handlers"
[4]: https://nextjs.org/docs/pages/guides/authentication?utm_source=chatgpt.com "Guides: Authentication"
