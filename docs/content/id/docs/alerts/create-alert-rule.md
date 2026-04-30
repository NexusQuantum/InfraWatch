+++
title = "Buat Alert Rule"
description = "Panduan form alert rule — entity scope, metric, operator, threshold, duration, severity."
weight = 51
date = 2026-04-23

[extra]
toc = true
+++

Sebuah alert rule adalah kondisi yang dapat dipakai ulang. Tulis sekali, dan evaluator akan memeriksanya terhadap setiap entity yang cocok pada setiap tick. Halaman ini memandu setiap field pada form **Create Alert Rule** dan menjelaskan bentuk JSON persis yang diharapkan endpoint `POST /api/alert-rules` — sehingga apa yang diisi di sini memetakan 1:1 ke baris yang masuk ke tabel `alert_rules`.

---

## Buka daftar rule

Navigasikan ke `/alerts` (atau klik ikon bell di header dan pilih **Manage rules**). Daftar rule menampilkan setiap baris di `alert_rules` yang diurutkan berdasarkan `created_at DESC`, dengan kolom untuk name, entity type, metric, threshold, severity, dan status enabled.

> 📸 **Screenshot needed:** `/images/alerts/rule-list.png`
> **Page to capture:** `/alerts` (rules tab)
> **What to show:** Daftar alert rule dengan beberapa rule dari severity yang berbeda, toggle enabled terlihat di setiap baris, dan tombol **New Rule** di kanan atas.

Klik **New Rule** untuk membuka dialog create.

> 📸 **Screenshot needed:** `/images/alerts/create-dialog.png`
> **Page to capture:** `/alerts` (modal create terbuka)
> **What to show:** Dialog create-rule kosong dengan setiap field terlihat — name, description, entity type, metric, operator, threshold, duration, severity, enabled.

---

## Field

Setiap field di bawah berkorespondensi dengan kolom di tabel `alert_rules` dan key di JSON body `POST /api/alert-rules`. Nama field yang ditampilkan dalam `monospace` adalah key persis yang diharapkan API.

### `name` — wajib

Judul singkat dan mudah dibaca yang ditampilkan di daftar rule, di toast, dan di template pesan alert. Contoh: `Host CPU > 90%`.

### `description` — opsional

Konteks bebas. Tempat yang baik untuk menautkan URL runbook atau menjelaskan *mengapa* threshold ini penting. Disimpan sebagai `description TEXT` dan diserialisasi sebagai `string | null`.

### `entityType` — wajib

Jenis entity yang menjadi target rule. Nilai valid saat ini (dari `lib/server/alert-evaluator.ts`):

| Value | Entity | Catatan |
|---|---|---|
| `host` | Host fisik atau VM yang dilaporkan oleh connector NQRust Hypervisor | Menggunakan field `current.*` per host |
| `compute_cluster` | Compute cluster logis (grup site + datacenter) | Menggunakan rata-rata cluster-wide |
| `storage_cluster` | Storage cluster | Menggunakan `capacity.usedPct` |


Dropdown ini didukung oleh enum yang sama yang dipakai evaluator untuk switch, sehingga memilih tipe juga memfilter daftar metric yang valid.

{{% alert icon="⚡" context="info" %}}
Mungkin ada referensi tipe entity "VM" dan "app" di dokumentasi lain. Evaluator yang tersedia saat ini tidak mengekstrak metric untuk keduanya — tiga tipe di atas adalah yang didukung. Jika extractor baru ditambahkan di `alert-evaluator.ts`, perbarui juga tabel ini.
{{% /alert %}}

### `metric` — wajib

Key metric yang evaluator tahu cara mengekstraknya dari entity type yang dipilih. Ini **bukan string PromQL mentah** — ini adalah field yang telah dihitung pada snapshot entity, diturunkan dari Prometheus bawaan NQRust Hypervisor di upstream connector client. Key yang valid per entity type:

| Entity type | Metric keys |
|---|---|
| `host` | `cpuUsagePct`, `memoryUsagePct`, `diskUsagePct`, `networkErrorRate` |
| `compute_cluster` | `avgCpuUsagePct`, `avgMemoryUsagePct`, `avgDiskUsagePct`, `pressureScore` |
| `storage_cluster` | `storageUsedPct` |


Saat mengisi form rule, pilih dari dropdown — yang dipilih adalah nama field, bukan PromQL.

### `operator` — wajib

Bagaimana `actualValue` dibandingkan dengan `threshold`. Backend menerima lima kode singkat dan UI me-render simbol-simbolnya:

| Code | Symbol | Arti |
|---|---|---|
| `gt` | `>` | Fire ketika actual lebih besar secara ketat |
| `gte` | `>=` | Fire ketika actual lebih besar atau sama |
| `lt` | `<` | Fire ketika actual lebih kecil secara ketat |
| `lte` | `<=` | Fire ketika actual lebih kecil atau sama |
| `eq` | `==` | Fire ketika actual sama dengan threshold |

> 📸 **Screenshot needed:** `/images/alerts/operator-dropdown.png`
> **Page to capture:** `/alerts` (modal create, dropdown operator terbuka)
> **What to show:** Kelima operator di-render sebagai `>`, `>=`, `<`, `<=`, `==` di dropdown.

### `threshold` — wajib

Batas numerik. Disimpan sebagai `DOUBLE PRECISION`. Satuan mengikuti metric-nya: persentase untuk `*UsagePct`, hitungan mentah untuk `networkErrorRate`, dll. Untuk rule "CPU > 90%" masukkan `90`, bukan `0.9`.

### `durationSeconds` — opsional (default `0`)

Berapa lama pelanggaran harus berlanjut sebelum alert menyala. Disimpan sebagai `INTEGER NOT NULL DEFAULT 0`.

{{% alert icon="⚡" context="info" %}}
`durationSeconds` di-persist pada setiap rule, dan evaluator hanya menyalakan setelah pelanggaran berlanjut — tetapi karena evaluasi berjalan paling banyak sekali per 60 detik, resolusi efektif field ini adalah tick 60-detik. Nilai `0` berarti "fire pada tick pertama ketika kondisi true".
{{% /alert %}}

### `severity` — wajib

Tingkat keparahan. Tipe `AlertRule.severity` adalah `"warning" | "critical"` — baik schema maupun evaluator memperlakukan ini sebagai field dua-nilai. Alert `critical` mendapat badge merah dan dihitung ke nomor bell-icon merah; alert `warning` mendapat kuning.

> 📸 **Screenshot needed:** `/images/alerts/severity-dropdown.png`
> **Page to capture:** `/alerts` (modal create, dropdown severity terbuka)
> **What to show:** Dropdown severity dengan opsi `warning` (badge kuning) dan `critical` (badge merah).

### `enabled` — opsional (default `true`)

Rule yang disabled tetap di tabel tetapi difilter keluar dari setiap pass evaluasi (`rules.filter((r) => r.enabled)`). Gunakan ini untuk sementara meng-silence rule yang berisik tanpa kehilangan konfigurasinya.

### `entityFilter` — opsional

Kolom `JSONB` untuk mempersempit rule ke subset entity — misalnya, `{ "site": "eu-west", "connectorId": "conn-abc" }`. Evaluator yang ada saat ini belum menerapkan `entityFilter` di sisi klien; kolom disimpan dan di-round-trip sehingga bisa diisi sekarang dan diperluas nanti.

---

## Preview sebelum menyimpan

Dialog create menyertakan panel preview yang menampilkan seperti apa pesan alert yang menyala. Evaluator menghasilkan pesan dengan template ini:

```
<entityName>: <metric> is <actualValue> (<operatorSymbol> <threshold>)
```

Jadi rule untuk `host` / `cpuUsagePct` / `gt` / `90` yang dievaluasi terhadap host bernama `web-07` pada CPU 94.2% menghasilkan:

```
web-07: cpuUsagePct is 94.2 (> 90)
```

> 📸 **Screenshot needed:** `/images/alerts/preview-panel.png`
> **Page to capture:** `/alerts` (modal create dengan semua field terisi)
> **What to show:** Form yang terisi di kiri dan kartu preview pesan alert yang ter-render di kanan, termasuk badge severity.

---

## Simpan

Klik **Create Rule**. UI memanggil:

```http
POST /api/alert-rules
Content-Type: application/json
x-csrf-token: <from csrf_token cookie>

{
  "name": "Host CPU > 90%",
  "description": "Runbook: wiki/runbooks/cpu-saturation",
  "entityType": "host",
  "metric": "cpuUsagePct",
  "operator": "gt",
  "threshold": 90,
  "severity": "critical",
  "durationSeconds": 300,
  "enabled": true
}
```

Response sukses mengembalikan `201 Created` dengan rule dalam bentuk `{ data: AlertRule }`. Server menetapkan ID dalam bentuk `rule-<16-hex>` dan timestamp `createdAt` / `updatedAt`. Rule tersebut akan diambil pada tick evaluasi berikutnya — dalam 60 detik.

---

## Mengedit dan menghapus

- **Edit** — `PUT /api/alert-rules/<id>` dengan subset apapun dari field di atas. Field yang dihilangkan dibiarkan tidak berubah.
- **Delete** — `DELETE /api/alert-rules/<id>`. Menghapus sebuah rule meng-cascade ke setiap firing alert yang dihasilkan oleh rule tersebut.

Kedua endpoint memerlukan header CSRF (`x-csrf-token` dari cookie `csrf_token`) dan session yang valid.

---

## Terkait

- [Connectors](../connectors/) — connector NQRust Hypervisor adalah sumber metric yang dibandingkan oleh rule.
- [Fleet & Monitoring](../fleet/) — snapshot entity yang dibaca evaluator.
- [Settings › Authentication](../settings/authentication/) — mengatur siapa yang dapat membuat rule.
