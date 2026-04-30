+++
title = "End User License Agreement"
description = "Ringkasan EULA InfraWatch dan apa yang dicakup oleh penerimaannya"
weight = 24
date = 2026-04-23

[extra]
toc = true
+++

Pada login pertama, setiap admin wajib membaca dan menerima End User License Agreement (EULA) sebelum dashboard InfraWatch dapat diakses. Layar EULA muncul otomatis setelah formulir login dan tidak dapat dilewati.

Halaman ini hanyalah ringkasan singkat sebagai alat bantu baca. **Teks yang otoritatif adalah perjanjian yang ditampilkan di UI dan versi lengkap di repositori** — lihat [EULA.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) dan terjemahan Bahasa Indonesia di [EULA Bahasa.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA%20Bahasa.md).

---

## Kapan EULA Ditampilkan

Penerimaan EULA wajib pada **login pertama**. Alurnya adalah:

```
/login  →  EULA modal  →  /setup/license  →  /  (dashboard)
```

Penerimaan disimpan bersama stempel versi. Jika Nexus Quantum Tech menerbitkan versi baru dari perjanjian, admin akan diminta untuk menerima ulang pada login berikutnya.

---

## Menerima EULA

1. Baca teks perjanjian lengkap di layar.
2. Centang **"I have read and agree to the End User License Agreement"**.
3. Klik **I Accept**.

Anda hanya perlu menerima sekali per versi EULA. Setelah diterima, modal tidak akan muncul lagi sampai versi EULA dinaikkan.

---

## Bahasa

EULA tersedia dalam dua bahasa:

- **Bahasa Inggris** — `EULA.md` di root repositori, juga ditampilkan secara default di UI.
- **Bahasa Indonesia** — `EULA Bahasa.md` di root repositori, tersedia via pemilih bahasa (ikon globe) di pojok kanan atas layar EULA.

Ganti bahasa sebelum membaca dan menerima. Teks legal yang mendasarinya setara di kedua versi.

---

## Ringkasan EULA

Teks legal lengkap ditampilkan di UI dan di-commit ke repositori. Poin-poin penting:

| Pasal | Ringkasan |
|---|---|
| **Pasal 1 — Hak Kekayaan Intelektual** | Seluruh hak cipta, paten, rahasia dagang, algoritma, source code, engine analitik, model AI, desain sistem, dan dokumentasi merupakan properti eksklusif **Nexus Quantum Tech**. Perjanjian hanya memberikan hak pakai — bukan kepemilikan. |
| **Pasal 2 — Pemberian Lisensi** | Anda menerima lisensi yang **terbatas, non-eksklusif, tidak dapat dialihkan, dan tidak dapat disublisensikan** yang cakupannya sesuai dengan jumlah lisensi yang dibeli. Ini bukan penjualan. |
| **Pasal 3 — Pembatasan Instalasi & Aktivasi** | InfraWatch hanya boleh dipasang sesuai jumlah lisensi valid. Perangkat lunak menegakkan ini melalui aktivasi lisensi, machine fingerprinting, hardware binding, license key, dan validasi online. |
| **Pasal 4 — Larangan Pembajakan & Modifikasi** | Duplikasi, redistribusi installer, penjualan kembali, reverse engineering, dekompilasi, penghapusan perlindungan lisensi, dan versi turunan tanpa izin semuanya **dilarang**. |
| **Pasal 5 — Hak untuk Audit** | Nexus Quantum Tech dapat mengaudit penggunaan perangkat lunak untuk memverifikasi kepatuhan lisensi. Pengguna wajib bekerja sama dengan proses audit. |
| **Pasal 6 — Telemetri** | InfraWatch mengirim data teknis terbatas (status lisensi, identifikasi perangkat, jumlah instalasi, versi perangkat lunak, data error teknis) untuk validasi lisensi. **Data monitoring operasional tidak pernah dikirim** tanpa izin eksplisit. |
| **Pasal 7 — Kewajiban Pengguna** | Gunakan secara sah, jaga kerahasiaan lisensi, jangan menyalahgunakan perangkat lunak, patuhi ketentuan Nexus Quantum Tech. |
| **Pengakhiran** | Lisensi berakhir otomatis atas pelanggaran salah satu ketentuan. Setelah berakhir, semua penggunaan harus dihentikan dan semua salinan harus dihapus. |

{{% alert icon="⚠️" context="warning" %}}
Halaman ini hanya ringkasan. EULA yang otoritatif adalah teks yang ditampilkan di UI dan di [EULA.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md). Jika Anda tidak menyetujui ketentuannya, jangan memasang atau menggunakan InfraWatch.
{{% /alert %}}

---

## Terkait

- [Aktivasi Lisensi](../license/) — mengaktifkan license key setelah menerima EULA.
- [Mulai Cepat](../quick-start/) — panduan menyeluruh login pertama dari ujung ke ujung.
- Perjanjian lengkap — [`EULA.md`](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) / [`EULA Bahasa.md`](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA%20Bahasa.md) di root repositori.
