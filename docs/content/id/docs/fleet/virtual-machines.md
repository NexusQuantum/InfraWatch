+++
title = "Virtual Machine"
description = "NQRust MicroVM — inventaris, alokasi, dan pemetaan host"
weight = 45
date = 2026-04-23

[extra]
toc = true
+++

Tampilan VM di `/vm` mendaftar setiap virtual machine yang dilaporkan oleh sumber NQRust Hypervisor yang terhubung. Setiap baris menampilkan alokasi, phase, dan host tempat VM berjalan — klik untuk masuk ke `/vm/[id]` untuk metrik per-VM dan tautan langsung kembali ke node induknya.

> 📸 **Screenshot needed:** `/images/fleet/vms/list.png`
> **Page to capture:** `/vm`
> **What to show:** Tabel VM dengan filter bar, kolom yang dapat diurutkan (Name, Namespace, Node, Phase, vCPU, Memory), dan pill status untuk running / pending / stopped / failed.

---

## Tampilan Daftar — `/vm`

### Filter

- **Search** — mencocokkan nama, namespace, hostname node, atau id connector
- **Phase** — all / running / pending / stopped / failed / unknown

### Kolom Tabel

| Kolom | Sumber | Catatan |
|---|---|---|
| **Name** | `name` | Klik baris untuk membuka detail |
| **Namespace** | `namespace` | Namespace workload atau label yang disuplai connector |
| **Host** | `node` | Menautkan ke `/hosts/[id]` |
| **Status / Phase** | `phase` → `VmStatus` | running / pending / stopped / failed / unknown |
| **vCPU** | `resources.cpuRequestedCores` | Jumlah vCPU yang diminta |
| **Memory** | `resources.memoryRequestedBytes` | Byte yang diminta, diformat KB/MB/GB |
| **IP** | `ipAddress` | IP pertama yang dapat digunakan yang diiklankan VM |
| **Uptime** | `uptimeSeconds` | Hari + jam untuk yang berjalan lama |

Kolom dapat diurutkan; banner diagnostik muncul ketika ada connector yang mengembalikan data partial.

---

## Tampilan Detail — `/vm/[id]`

> 📸 **Screenshot needed:** `/images/fleet/vms/detail.png`
> **Page to capture:** `/vm/[id]`
> **What to show:** Halaman detail VM dengan header (nama + pill phase), kartu metrik untuk vCPU / memory / uptime / IP, dan kartu "Host" yang menautkan ke node induk.

Id VM di URL adalah compound `<connectorId>:<namespace>:<name>`. Halaman detail menampilkan:

- **Header** — nama VM, namespace, pill phase, badge connector
- **Kartu alokasi sumber daya** — vCPU yang diminta, memory yang diminta, penggunaan CPU aktual sebagai % dari request, penggunaan memory aktual sebagai % dari request
- **Kartu jaringan** — alamat IP, rate Rx/Tx, network error rate
- **Uptime & lifecycle** — phase saat ini, uptime, timestamp pembuatan, restart terakhir
- **Pemetaan host** — tautan keluar ke node induk (`/hosts/[id]`)

State lifecycle NQRust MicroVM dinormalisasi ke enum `VmStatus` yang sama.

> 📸 **Screenshot needed:** `/images/fleet/vms/metrics.png`
> **Page to capture:** `/vm/[id]`
> **What to show:** Grid kartu metrik dengan vCPU requested/used, Memory requested/used, Network Rx/Tx, dan tautan drill-down host yang disorot.

---

## Pemetaan Host & Kapasitas

Host mencadangkan kapasitas VM menggunakan model slot tetap:

| Slot | vCPU | Memory |
|---|---|---|
| **S** | 1 | 2 GiB |
| **M** | 2 | 4 GiB |
| **L** | 4 | 8 GiB |

Halaman detail setiap host melaporkan slot bebas (S / M / L) bersama dengan jumlah VM yang berjalan, sehingga Anda dapat mengetahui secara sekilas berapa banyak kapasitas microVM tambahan yang dimiliki node.

{{% alert icon="⚡" context="info" %}}
Daftar VM menggabungkan data dari setiap connector NQRust Hypervisor aktif menjadi satu inventaris. Filter berdasarkan namespace atau id connector bila diperlukan.
{{% /alert %}}

---

## Sumber Data

Halaman memanggil `/api/live/vm`, yang mendelegasikan ke `fetchLiveVms()` di domain layer dan mengagregasi inventaris NQRust MicroVM dari setiap connector `nqrust_hypervisor` aktif.

Kegagalan pada satu connector mengembalikan 502 dengan body error terstruktur, yang ditampilkan UI sebagai banner diagnostik di bagian atas daftar.

---

## Terkait

- [Host](../hosts/) — tab inventaris VM pada setiap detail host
- [Connectors](../../connectors/) — tambahkan atau kelola sumber NQRust Hypervisor
- [Alerts](../../alerts/) — threshold phase dan resource VM
