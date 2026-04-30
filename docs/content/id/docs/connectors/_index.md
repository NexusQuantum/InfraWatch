+++
title = "Connectors"
description = "Tautan berkredensial ke sumber metrik NQRust Hypervisor."
weight = 30
date = 2026-04-23

[extra]
toc = true
+++

**Connector** adalah tautan berkredensial dan terenkripsi dari InfraWatch ke endpoint metrik NQRust Hypervisor Anda.

> 📸 **Screenshot needed:** `/images/connectors/list.png`
> **Page to capture:** `/connectors`
> **What to show:** Daftar connector dengan kartu status atas dan beberapa baris NQRust Hypervisor pada kondisi health berbeda.

---

## Tipe connector

InfraWatch saat ini mendokumentasikan dan mendukung satu tipe connector produksi:

| Tipe | Sumber | Data yang didapat |
|---|---|---|
| `nqrust_hypervisor` | Prometheus tertanam NQRust Hypervisor | Metrik host, inventaris VM, pemetaan VM-ke-host, telemetri storage |

---

## Field connector

Setiap connector menyimpan:

- `connectorType` (`nqrust_hypervisor`)
- `baseUrl` (endpoint kompatibel `/api/v1`)
- Auth (`none`, `basic`, `bearer`) yang dienkripsi lewat `CONNECTOR_ENCRYPTION_KEY`
- Label `environment`, `site`, `datacenter`
- Opsi TLS (`insecureTls`)
- Catatan operator opsional

---

## Siklus hidup

1. Tambah connector di `/connectors`.
2. Jalankan **Test Connection** (`sum(up)`).
3. Simpan record connector terenkripsi di PostgreSQL.
4. Health polling memperbarui status dan latensi.
5. Halaman fleet menarik data connector tersebut.

> 📸 **Screenshot needed:** `/images/connectors/add-dialog.png`
> **Page to capture:** `/connectors` (klik **Add Connector**)
> **What to show:** Side-sheet Add Connector dengan URL, mode auth, label, dan opsi TLS terlihat.

---

## Nilai status

- `healthy`: probe inti dan cek wajib lolos
- `degraded`: probe inti lolos, ada cek wajib yang gagal
- `down`: probe inti gagal atau connector dinonaktifkan
- `misconfigured`: status fallback lama

---

## Sub-halaman

- [NQRust Hypervisor](nqrust-hypervisor/) - setup dan troubleshooting connector hypervisor
- [Manage Connectors](manage-connectors/) - buat, edit, test, toggle, hapus connector

---

## Terkait

- [Fleet & Monitoring](../fleet/)
- [Alerts](../alerts/)
- [API Reference > Connectors](../api-reference/#connectors)
