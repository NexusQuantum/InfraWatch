+++
title = "Data Model"
description = "Tabel PostgreSQL yang dibuat otomatis oleh InfraWatch pada startup pertama dan apa yang disimpan oleh masing-masing tabel."
weight = 71
date = 2026-04-23

[extra]
toc = true
+++

InfraWatch memiliki skema-nya sendiri secara end-to-end: pada startup pertama aplikasi terhubung ke `DATABASE_URL` dan secara otomatis membuat setiap tabel yang tercantum di bawah. Anda tidak perlu menjalankan migrasi secara manual — tetapi mengetahui bentuknya berguna ketika Anda perlu melakukan backup, restore, atau melakukan query data operasional secara langsung.

{{% alert icon="🛡" context="warning" %}}
Jangan mengedit tabel-tabel ini secara manual di production. Session, state throttling alert, dan aktivasi lisensi semuanya bergantung pada invariant yang ditegakkan aplikasi pada saat penulisan. Gunakan UI atau [API reference](../../api-reference/) untuk melakukan perubahan.
{{% /alert %}}

---

## `license`

Menyimpan kunci lisensi saat ini beserta state aktivasi yang telah diverifikasi.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | integer (PK) | Baris singleton — hanya satu lisensi aktif pada satu waktu. |
| `license_key` | text | Kunci aktivasi mentah yang disuplai oleh operator. |
| `status` | text | `active`, `grace`, `expired`, atau `unlicensed`. |
| `activated_at` | timestamptz | Kapan kunci terakhir diverifikasi terhadap license server. |
| `last_checked_at` | timestamptz | Pemeriksaan ulang sukses terakhir, digunakan untuk perhitungan grace period. |
| `payload` | jsonb | Metadata bertandatangan (product, tier, max connector) dari license server. |

**Tujuan.** Sumber kebenaran tunggal untuk lisensi. `LICENSE_GRACE_PERIOD_DAYS` mengontrol berapa lama aplikasi tetap operasional setelah pemeriksaan ulang online gagal; `LICENSE_PUBLIC_KEY` mengaktifkan validasi tanda tangan offline untuk `payload` (RSA+SHA-256, Ed25519, atau Ed448 — algoritma diturunkan dari tipe kunci).

---

## `admin_user`

Satu akun admin yang digunakan untuk login lokal (non-SSO).

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | integer (PK) | Kunci surrogate. |
| `username` | text unique | Default `admin` (env var `ADMIN_USERNAME`). |
| `password_hash` | text | Hash scrypt dari password. |
| `created_at` | timestamptz | Waktu pembuatan baris. |
| `updated_at` | timestamptz | Dinaikkan saat password diubah. |

**Tujuan.** Penyimpan kredensial admin lokal. Pada boot pertama, InfraWatch menyemai tabel ini dari `ADMIN_USERNAME` / `ADMIN_PASSWORD` jika tabel kosong — ubah password segera setelah login pertama.

---

## `sessions`

Token session browser yang diterbitkan saat login.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `token` | text (PK) | Identifier session opaque ber-entropi tinggi; disimpan di cookie `session`. |
| `created_at` | timestamptz | Kapan session diterbitkan. |
| `expires_at` | timestamptz | Expiry keras — 30 hari setelah pembuatan. |
| `sso_provider` | text | `saml` atau `oidc` jika session dibuat melalui SSO; null untuk login lokal. |
| `sso_email` | text | Email yang diklaim oleh IdP. |
| `sso_name` | text | Display name yang diklaim oleh IdP. |

**Tujuan.** Session bersifat server-side — melakukan rotasi `CONNECTOR_ENCRYPTION_KEY` atau me-restart aplikasi tidak membatalkan session yang aktif. Baris yang expired dibersihkan secara lazy saat lookup.

---

## `login_attempts`

Buku catatan rate-limit per-IP untuk login lokal.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | bigserial (PK) | |
| `ip` | text | IP klien yang diekstrak dari `X-Forwarded-For` / `X-Real-IP` / socket. |
| `attempted_at` | timestamptz | Waktu insert. |

**Tujuan.** Menegakkan "5 percobaan gagal per 15 menit" terhadap `/api/auth/login`. Baris yang lebih tua dari jendela waktu diabaikan. Tidak ada counter yang dipelihara; kebijakannya adalah rolling count dari baris di dalam jendela.

---

## `connectors`

Definisi sumber metric — NQRust Hypervisor.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | uuid (PK) | Dihasilkan saat pembuatan. |
| `name` | text | Display name yang dipilih operator. |
| `connector_type` | text | `nqrust_hypervisor`. |
| `base_url` | text | Root `/api/v1` yang Prometheus-compatible. |
| `auth_type` | text | `none`, `basic`, atau `bearer`. |
| `auth_credentials` | text | Ciphertext AES-256-GCM dari secret (lihat [Security model](security-model/)). |
| `insecure_tls` | boolean | Lewati verifikasi TLS untuk sertifikat self-signed. |
| `environment` | text | Label namespacing — `prod`, `stg`, dll. |
| `site` | text | Label geografis. |
| `datacenter` | text | Label lokasi yang lebih granular. |
| `notes` | text | Catatan operator bebas-format. |
| `enabled` | boolean | Jika false, layer domain melewati connector ini. |
| `created_at` / `updated_at` | timestamptz | Timestamp audit. |

**Tujuan.** Setiap host, cluster, VM, dan alert dalam fleet view bersumber melalui satu baris di sini. Secret dienkripsi saat disimpan; hanya di-dekripsi secara transient oleh klien Prometheus.

---

## `connector_health`

Riwayat kesehatan bergulir untuk setiap connector.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | bigserial (PK) | |
| `connector_id` | uuid (FK → `connectors.id`) | Connector induk. |
| `checked_at` | timestamptz | Kapan probe dijalankan. |
| `status` | text | `healthy`, `degraded`, `unreachable`. |
| `latency_ms` | integer | Round-trip time dari probe. |
| `error` | text | Pesan diagnostik opsional saat gagal. |

**Tujuan.** Menyuplai halaman Connectors (`/live/connectors`) dan mendukung chart tren. Ditulis oleh endpoint test dan oleh probe latar belakang periodik.

---

## `alert_rules`

Threshold yang didefinisikan operator yang mendorong pemicuan alert.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | Nama rule yang mudah dibaca manusia. |
| `entity_type` | text | `host`, `compute_cluster`, `storage_cluster`, … |
| `metric` | text | Atribut entity atau metric turunan (mis. `cpu_pct`, `memory_pct`). |
| `operator` | text | `>`, `>=`, `<`, `<=`, `==`, `!=`. |
| `threshold` | double precision | Batas numerik. |
| `severity` | text | `info`, `warning`, `critical`. |
| `enabled` | boolean | Evaluator melewati rule yang dinonaktifkan. |
| `scope` | jsonb | Filter opsional (environment, site, datacenter, regex nama). |
| `created_at` / `updated_at` | timestamptz | |

**Tujuan.** Mendorong `alert-evaluator.ts`. Rule dievaluasi terhadap setiap entity yang dilihat evaluator, disaring oleh `scope`, menggunakan cache live yang sama dengan UI.

---

## `alerts`

Alert yang dipicu (dan yang telah resolved).

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | uuid (PK) | |
| `rule_id` | uuid (FK → `alert_rules.id`) | Rule yang memicu. |
| `entity_type` | text | Mirror dari `entity_type` milik rule. |
| `entity_id` | text | Id stabil dari entity (mis. id host, id cluster). |
| `entity_name` | text | Display name pada saat pemicuan. |
| `severity` | text | Disalin dari rule pada saat pemicuan. |
| `status` | text | `firing`, `acknowledged`, atau `resolved`. |
| `value` | double precision | Nilai yang teramati yang melewati threshold. |
| `threshold` | double precision | Threshold dari rule pada saat pemicuan. |
| `fired_at` | timestamptz | Kapan alert terbuka. |
| `acknowledged_at` | timestamptz | Disetel oleh `PATCH /api/alerts/[id]` dengan `action=acknowledge`. |
| `resolved_at` | timestamptz | Disetel saat auto-resolve atau `action=resolve` eksplisit. |
| `labels` | jsonb | Label environment, site, datacenter, dan label scope lainnya. |

**Tujuan.** Satu aliran alert untuk UI, count badge, dan audit. Compound index pada `(status, fired_at)` dan `(entity_type, entity_id)` menjaga lookup tetap cepat pada jutaan baris. Baris dengan `status=resolved` dan `resolved_at < now() - 30 days` dibersihkan oleh evaluator.

---

## `audit_log`

Aksi administratif.

| Kolom | Tipe | Tujuan |
|---|---|---|
| `id` | bigserial (PK) | |
| `action` | text | Key bertitik — `auth.login`, `auth.logout`, `connector.create`, `connector.update`, `connector.delete`, `sso.config_updated`, … |
| `target_id` | text | Id resource target opsional. |
| `target_name` | text | Display name target opsional. |
| `detail` | jsonb | Metadata arbitrer yang spesifik per-aksi. |
| `ip` | text | IP klien yang diekstrak dari header permintaan. |
| `created_at` | timestamptz | Waktu insert. |

**Tujuan.** Catatan yang tidak dapat disangkal (non-repudiable) tentang siapa yang melakukan apa. Ditulis oleh `lib/server/audit.ts` dari setiap route handler yang melakukan mutasi. Pertahankan tanpa batas waktu kecuali kebijakan kepatuhan Anda menentukan lain.

---

## Langkah selanjutnya

- [Security model](security-model/) — bagaimana kolom-kolom secret di atas dilindungi.
- [Settings & Admin](../../settings/) — UI yang menulis ke tabel-tabel ini.
