+++
title = "NQRust Hypervisor"
description = "Metrik host dan inventaris per-VM dari cluster NQRust Hypervisor."
weight = 32
date = 2026-04-23

[extra]
toc = true
+++

Connector `nqrust_hypervisor` dibuat khusus untuk lingkungan **NQRust Hypervisor**. InfraWatch mengakses Prometheus bawaan hypervisor lewat endpoint proxy Rancher/Harvester dan melakukan autentikasi menggunakan pasangan Access Key / Secret Key.

---

## Data yang didapat

- Telemetri host: CPU, memori, disk, network, load, uptime
- Inventaris VM dan visibilitas siklus hidup VM
- Pemetaan VM-ke-host untuk perencanaan kapasitas
- Telemetri storage dari stack monitoring hypervisor

---

## Panduan setup

Connector membutuhkan dua hal dari NQRust Hypervisor:

1. **URL Prometheus** — diekspos oleh add-on `rancher-monitoring`.
2. **Pasangan API Key** — dibuat dari halaman Account & API Keys admin.

Selesaikan langkah 1 dulu (supaya Prometheus sudah mengumpulkan metrik), baru lanjut ke langkah 2.

### 1. Enable rancher-monitoring

Stack Prometheus dikirim sebagai add-on opt-in. Enable sekali per hypervisor.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/1-addons.png" alt="Advanced → Add-ons" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Buka console NQRust Hypervisor lalu buka **Advanced → Add-ons**. Akan terlihat daftar add-on dengan `rancher-monitoring` dalam status **Disabled**.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/2-rancher-mon-addons.png" alt="Detail add-on rancher-monitoring" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Klik `rancher-monitoring` untuk membuka detail add-on.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/3-enable.png" alt="Enable dari menu overflow" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Buka menu overflow (titik tiga `⋮` di sebelah **Show Configuration**) lalu pilih **Enable**. Proses deploy butuh satu sampai dua menit; status berubah `Disabled → Enabling → Deploy Successful`.

{{% alert icon="⚡" context="info" %}}
Konfigurasi default sudah cukup untuk sebagian besar fleet: Scrape Interval `1m`, Retention `5d`, Retention Size `50GiB`, CPU request `750m`, memory request `1750Mi`. Ubah hanya jika butuh retention lebih lama atau resource node terbatas.
{{% /alert %}}

### 2. Salin URL Prometheus

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/4-navigate-to-prome.png" alt="Tab Prometheus pada rancher-monitoring" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Setelah add-on menunjukkan **Deploy Successful**, klik tab **Prometheus** lalu klik ikon external-link di samping **Prometheus Graph**. Browser akan membuka UI Prometheus lewat proxy Rancher. Salin URL dari address bar — bentuknya seperti ini:

```text
https://<hypervisor-host>/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy
```

Contoh:

```text
https://192.168.18.230/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy
```

Seluruh string tersebut — termasuk suffix `/proxy`, dan **tanpa** tambahan apa pun setelahnya — dimasukkan ke field Hypervisor Prometheus URL di InfraWatch.

### 3. Buat Access Key dan Secret Key

NQRust Hypervisor mengeluarkan kredensial dalam bentuk pasangan **Access Key + Secret Key**. InfraWatch menggabungkan keduanya menjadi satu bearer token.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/1.png" alt="Menu avatar → Account & API Keys" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Klik avatar admin di pojok kanan atas lalu pilih **Account & API Keys**.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/2.png" alt="Daftar API Keys" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Halaman ini menampilkan daftar key yang ada beserta API Endpoint (contoh `https://192.168.18.230/v3`). Klik **Create API Key** di kanan atas.

<div style="margin: 1rem 0;">
  <img src="/images/connectors/hv-setup/api/3.png" alt="Form pembuatan API Key" style="max-width: 100%; border: 1px solid #e5e7eb; border-radius: 6px;" />
</div>

Isi form:

- **Description** — deskripsi yang mudah dikenali, contoh `infrawatch-readonly`
- **Scope** — biarkan `No Scope` untuk akses baca penuh
- **Automatically expire** — pilih `Never` untuk token connector jangka panjang (atau sesuaikan dengan rotasi key tim)

Klik **Create**. Layar berikutnya menampilkan **Access Key** (bentuknya `token-f56kh`) dan **Secret Key** (string panjang). Secret Key **hanya ditampilkan sekali** — salin keduanya segera.

### 4. Masukkan ke InfraWatch

Di InfraWatch, buka `/connectors` → **Add Connector**:

| Field | Nilai |
|---|---|
| Cluster Name | Nama bebas — contoh `NQRust Production` |
| Hypervisor Prometheus URL | URL `.../proxy` dari langkah 2 |
| Auth Mode | **Bearer token** |
| Bearer Token | `<access_key>:<secret_key>` — kedua key digabung dengan titik dua |
| Environment / Site / Datacenter | Label untuk grouping fleet |
| Insecure TLS | Aktifkan jika hypervisor pakai sertifikat self-signed |

Contoh bearer token:

```text
token-f56kh:j8qkrvgqlljmrxwgzjh6t2p6m9srrmmq79jvdh9lfjjttsck8v2z27
```

Klik **Add Connector** lalu **Test Connection** di halaman detail connector. Tes healthy biasanya mengembalikan latensi di ratusan milidetik.

{{% alert icon="🔐" context="info" %}}
Lebih suka Basic auth? Ubah **Auth Mode** menjadi Basic lalu pakai Access Key sebagai username dan Secret Key sebagai password. Kedua mode sama-sama valid; Bearer hanya lebih ringkas karena cuma satu field.
{{% /alert %}}

Kredensial dienkripsi saat disimpan dengan AES-256-GCM — lihat [Security model](../../architecture/security-model/) untuk detail.

---

## Tes koneksi

**Test Connection** menjalankan `sum(up)` terhadap endpoint dan menampilkan latensi round-trip. Saat disimpan, InfraWatch juga menjalankan cek hypervisor wajib lalu menandai status `healthy` atau `degraded`.

> 📸 **Screenshot needed:** `/images/connectors/nqrust-hypervisor-test-success.png`
> **Page to capture:** `/connectors/{id}` (after **Test Connection**)
> **What to show:** Banner test berhasil dengan latensi dan status healthy.

---

## Pemecahan masalah

### Metrik host tidak muncul

Pastikan add-on `rancher-monitoring` berada di status **Deploy Successful**, dan node exporter (di tab **Prometheus Node Exporter**) berjalan.

### Metrik storage tidak muncul

Pastikan stack storage sedang discrape `rancher-monitoring`. Cek UI Prometheus yang dibuka di langkah 2 untuk memastikan `up == 1` pada exporter storage.

### 401 atau 403 saat test

Access Key atau Secret Key salah, dicabut, atau sudah expired. Buat pasangan baru dari **Account & API Keys** lalu update connector.

### Connection refused / timeout

Pastikan host hypervisor bisa dijangkau dari InfraWatch (`curl -k https://<host>/k8s/clusters/local/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy/api/v1/query?query=up`). Jika hypervisor pakai sertifikat self-signed, aktifkan **Insecure TLS** pada connector.

---

## Terkait

- [Ringkasan connectors](../)
- [Manage Connectors](../manage-connectors/)
- [Fleet & Monitoring](../../fleet/)
- [API Reference > Connectors](../../api-reference/#connectors)
