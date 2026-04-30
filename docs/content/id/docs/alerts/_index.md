+++
title = "Alerts"
description = "Aturan alert berbasis threshold dengan evaluasi ter-batch, auto-resolusi, dan retensi 30 hari."
weight = 50
date = 2026-04-23

[extra]
toc = true
+++

Alerts memungkinkan InfraWatch menandai entity yang tidak sehat tanpa harus terus-menerus memantau dashboard. Cukup tulis **rules** — "bunyikan warning ketika CPU host tetap di atas 90% selama 5 menit" — dan evaluator akan mengubah pelanggaran yang berlanjut menjadi **firing alerts** lengkap dengan severity, konteks entity, dan pesan yang mudah dibaca.

---

## Rules vs. firing alerts

Dua konsep berbeda hidup berdampingan:

| Konsep | Apa itu | Di mana letaknya | Disimpan di |
|---|---|---|---|
| **Alert rule** | Kondisi yang dapat dipakai ulang yang ditulis sekali (`metric + operator + threshold + entity scope`) | Halaman `/alert-rules`, CRUD via `/api/alert-rules` | Tabel `alert_rules` |
| **Firing alert** | Insiden konkret yang terpicu ketika sebuah rule cocok dengan entity tertentu saat ini | Halaman `/alerts` dan dropdown bell, dibaca via `/api/alerts` | Tabel `alerts` |

Satu rule dapat menghasilkan nol, satu, atau banyak firing alert secara bersamaan — satu per entity yang cocok. Menghapus sebuah rule akan meng-cascade ke firing alert-nya (`ON DELETE CASCADE` pada `alerts.rule_id`).

---

## Bagaimana evaluasi bekerja

Evaluator di `lib/server/alert-evaluator.ts` berjalan **paling banyak sekali per 60 detik** tanpa peduli seberapa sering SWR hooks di klien melakukan polling. Invokasi yang datang di dalam jendela itu diabaikan, dan panggilan kedua yang datang saat evaluasi sedang berjalan juga dilewati. Ini menjaga amplifikasi tulis database tetap konstan meskipun ada dua puluh dashboard yang terbuka.

Setiap pass evaluasi sepenuhnya **ter-batch**:

1. Muat setiap rule yang enabled (satu query).
2. Ambil setiap alert yang saat ini aktif atau telah di-acknowledge untuk rule ID tersebut (satu query, `batchFindActiveAlerts`).
3. Jelajahi snapshot entity in-memory (hosts, compute clusters, dan storage clusters) yang sudah diambil oleh dashboard, ekstrak metric rule dari setiap entity, dan bandingkan dengan threshold.
4. Kumpulkan dua daftar: alert yang perlu **dibuat** (terpicu dan belum ada alert aktif) dan alert yang perlu **di-resolve** (tidak lagi memicu tetapi alert aktif ada).
5. Jalankan `batchCreateAlerts` dan `batchAutoResolve` secara paralel — dua query terlepas dari ukuran fleet.

Dengan kata lain: jumlah SQL writes per tick adalah O(1) terhadap ukuran fleet dan O(1) terhadap jumlah rule. Lihat [Architecture › Alert pipeline](../architecture/) untuk aliran data lengkap.

{{% alert icon="⚡" context="info" %}}
Evaluasi dipicu secara lazy dari data-loader dashboard utama. Jika tidak ada dashboard yang terbuka dan tidak ada code path lain yang memanggil `evaluateAlerts()`, tidak ada evaluasi yang berjalan. Tidak ada background worker khusus — InfraWatch menumpang pada request yang sudah mengambil snapshot entity.
{{% /alert %}}

---

## Auto-resolusi

Firing alert me-resolve sendiri begitu metric yang mendasarinya berhenti melanggar threshold. Pada setiap pass, evaluator:

- Membangun set `touchedKeys` berisi pasangan `${ruleId}:${entityId}` yang benar-benar dilihatnya.
- Membalik setiap alert aktif dalam set tersebut yang metric-nya tidak lagi memicu menjadi `status = 'resolved'` dengan `resolved_at = NOW()`.

Tidak ada langkah manual "tandai sebagai sehat kembali" — host, cluster, atau pod yang pulih akan di-resolve pada tick berikutnya (dalam ~60 detik setelah pemulihan). Resolusi manual tetap bisa dilakukan dari UI untuk kasus tepi; lihat [Kelola Firing Alerts](manage-alerts/).

---

## Retensi dan auto-purge

Alert yang sudah resolved **tidak disimpan selamanya**. `purgeOldAlerts()` berjalan di akhir setiap pass evaluasi (dibatasi sekali per jam) dan menghapus baris dari tabel `alerts` di mana:

- `status = 'resolved'`, dan
- `resolved_at < NOW() - INTERVAL '30 days'`.

Alert yang aktif dan yang telah di-acknowledge tidak pernah di-purge — hanya yang sudah resolved setelah batas 30 hari.

{{% alert icon="⚡" context="warning" %}}
Alert yang resolved lebih dari 30 hari akan di-purge otomatis dari tabel `alerts` dan tidak dapat dipulihkan. Jika diperlukan riwayat insiden jangka panjang, ekspor alert melalui API atau forward ke SIEM eksternal sebelum kedaluwarsa.
{{% /alert %}}

> 📸 **Screenshot needed:** `/images/alerts/overview.png`
> **Page to capture:** `/alerts`
> **What to show:** Tampilan split — daftar rule di kiri, firing alerts di kanan, dengan ikon bell di header kanan atas menampilkan badge hitungan.

---

## Sub-halaman

- **[Buat Alert Rule](create-alert-rule/)** — panduan setiap field pada form rule (metric, operator, threshold, duration, severity, entity scope).
- **[Kelola Firing Alerts](manage-alerts/)** — daftar alerts, filter, aksi acknowledge/resolve, dan badge hitungan alert.

---

## Terkait

- [Connectors](../connectors/) — alert dievaluasi terhadap metric yang dikirim oleh connector NQRust Hypervisor.
- [Fleet & Monitoring](../fleet/) — sumber snapshot entity yang memberi masukan ke evaluator.
- [Settings › Authentication](../settings/authentication/) — siapa yang diizinkan membuat dan mengelola alert rule.
