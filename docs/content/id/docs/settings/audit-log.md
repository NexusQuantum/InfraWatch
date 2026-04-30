+++
title = "Log Audit"
description = "Skema tabel audit_log, aksi persis yang dicatat, dan cara memangkas baris lama"
weight = 64
date = 2026-04-23

[extra]
toc = true
+++

Setiap aksi yang relevan dengan keamanan di InfraWatch menulis baris ke `audit_log` di PostgreSQL via `logAudit()` di `lib/server/audit.ts`. Tabel bersifat append-only dari perspektif aplikasi — kode tidak pernah meng-update atau menghapus baris — sehingga Anda mendapatkan rekaman kronologis lengkap tentang login, perubahan connector, dan perubahan konfigurasi SSO.

Saat ini **tidak ada retensi otomatis**. Baris lama akan ada selamanya kecuali Anda memangkasnya.

---

## Skema

```sql
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  action      TEXT NOT NULL,                                -- e.g. "auth.login"
  target_id   TEXT,                                         -- opaque identifier of the affected object
  target_name TEXT,                                         -- human-readable name of the affected object
  detail      JSONB,                                        -- structured context (username, error, etc.)
  ip_address  TEXT,                                         -- client IP from x-forwarded-for / x-real-ip
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Setiap field kecuali `action` dan `created_at` bersifat nullable. Handler mengisi `target_id` / `target_name` ketika aksi merujuk ke objek tertentu (mis. sebuah connector), dan `detail` adalah objek JSON sembarang — tidak ada skema padanya, hanya konvensi.

`logAudit()` menangkap dan mencatat error database apapun secara internal (via `console.error`) dan tidak pernah throw — gangguan audit-log tidak merusak request yang memicunya. Tinjau `lib/server/audit.ts` jika Anda mengubah perilaku tersebut.

---

## Apa yang Dicatat

Daftar di bawah adalah **setiap kunci aksi yang ditulis saat ini**, diverifikasi dengan meng-grep codebase. Perlakukan ini sebagai otoritatif — jika sebuah fitur yang Anda harapkan diaudit tidak tercantum di sini, ia saat ini tidak dicatat.

### Autentikasi

| Aksi | Dipancarkan oleh | Field `detail` |
|---|---|---|
| `auth.login` | `POST /api/auth/login` pada keberhasilan | `{ username }` |
| `auth.login_failed` | `POST /api/auth/login` pada kredensial salah | `{ username }` (password tidak pernah dicatat) |
| `auth.logout` | `POST /api/auth/logout` | *(tidak ada)* |
| `auth.sso_login` | `POST /api/auth/sso/saml/callback`, `GET /api/auth/sso/oidc/callback` pada keberhasilan | `{ provider, email, name }` |
| `auth.sso_login_failed` | Dua route yang sama pada kegagalan | `{ provider, error }` |

### Connector

| Aksi | Dipancarkan oleh | Field `detail` |
|---|---|---|
| `connector.create` | `POST /api/connectors` | Lihat `app/api/connectors/route.ts` |
| `connector.update` | `PATCH /api/connectors/[id]` | Lihat `app/api/connectors/[id]/route.ts` |
| `connector.delete` | `DELETE /api/connectors/[id]` | Lihat `app/api/connectors/[id]/route.ts` |

### SSO

| Aksi | Dipancarkan oleh | Field `detail` |
|---|---|---|
| `sso.config_updated` | `PUT /api/settings/sso` | `{ provider, enabled }` |

### Belum Diaudit

Brief task mencantumkan perubahan alert-rule, perubahan lisensi, dan update pengguna admin sebagai event audit yang diharapkan. Pada saat penulisan, **tidak ada satupun dari permukaan ini memanggil `logAudit()`** — lihat source untuk detail:

- Alert rule (`app/api/alert-rules/*`) — belum tersambung. Untuk menambahkan, panggil `logAudit("alert_rule.create" | "alert_rule.update" | "alert_rule.delete", …)` dari handler.
- Perubahan lisensi (`app/api/license/*`) — belum tersambung.
- Update pengguna admin — tidak ada endpoint admin-update; baris hanya di-seed pada boot pertama (lihat [Autentikasi](../authentication/)).

{{% alert icon="⚠️" context="warning" %}}
Jika persyaratan kepatuhan Anda menuntut rekaman audit untuk perubahan alert-rule atau lisensi, tambahkan panggilan `logAudit()` ke handler route yang relevan. Signature helper bersifat stabil: `logAudit(action, { targetId?, targetName?, detail?, ip? })`.
{{% /alert %}}

---

## Melihat Log

InfraWatch saat ini tidak mengirim halaman viewer audit-log khusus — `app/settings/page.tsx` tidak memiliki bagian audit, dan tidak ada route `/audit`. Sampai ada yang ditambahkan, query tabelnya langsung:

```sql
-- Recent events, newest first
SELECT created_at, action, ip_address, detail
FROM audit_log
ORDER BY created_at DESC
LIMIT 50;

-- Failed logins from a specific IP in the last day
SELECT created_at, detail->>'username' AS username
FROM audit_log
WHERE action = 'auth.login_failed'
  AND ip_address = '10.0.0.42'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Every SSO config change
SELECT created_at, detail
FROM audit_log
WHERE action = 'sso.config_updated'
ORDER BY created_at DESC;
```

> 📸 **Screenshot placeholder (page not yet implemented):** Jika viewer audit-log ditambahkan di bawah `/settings`, ambil capture di `/images/settings/audit-log/audit-log-viewer.png` menampilkan daftar event dengan action, timestamp, IP, dan baris detail yang dibuka.

---

## Retensi

**Retensi tidak otomatis.** Tidak ada background job, tidak ada entri cron yang dipasang installer, dan tidak ada setting konfigurasi untuk membatasi ukuran tabel. Pencarian cepat di `lib/server/` mengkonfirmasi hanya alerts store yang memiliki rutin purge (`purgeOldAlerts()` di `alerts-store.ts`); audit log tidak memiliki padanan.

Anda punya dua pilihan:

### Pemangkasan Manual

Jalankan delete periodik — cron harian biasanya cukup:

```sql
-- Keep the last 90 days
DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';

-- Or keep the last 1 000 000 rows
DELETE FROM audit_log
WHERE id < (SELECT id FROM audit_log ORDER BY id DESC OFFSET 1000000 LIMIT 1);
```

Bungkus ini dalam panggilan `psql` dari cron atau systemd timer:

```bash
0 3 * * * psql -U infrawatch -d infrawatch \
  -c "DELETE FROM audit_log WHERE created_at < NOW() - INTERVAL '90 days';"
```

### Arsip Eksternal

Sebelum memangkas, ekspor ke penyimpanan jangka panjang sehingga query kepatuhan tetap ada:

```bash
psql -U infrawatch -d infrawatch \
  -c "\COPY (SELECT * FROM audit_log WHERE created_at < NOW() - INTERVAL '30 days') \
      TO '/var/backups/infrawatch/audit-$(date +%Y-%m).csv' CSV HEADER"
```

Rotasi CSV ini keluar dari host (S3, cold storage, ingestion SIEM, dll.) sebelum menghapus baris dari tabel live.

{{% alert icon="⚠️" context="warning" %}}
Menghapus dari `audit_log` adalah satu-satunya operasi destruktif di tabel yang hanya `INSERT`. Selalu backup terlebih dahulu. Jika Anda memerlukan tamper-evidence, replikasi baris ke penyimpanan eksternal append-only (mis. object storage dengan object-lock) segera setelah ditulis — jangan mengandalkan tabel live saja.
{{% /alert %}}

---

## Terkait

- [Aktivasi Lisensi](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Arsitektur](../../architecture/)
