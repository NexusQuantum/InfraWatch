+++
title = "Manage Connectors"
description = "Buat, edit, test, aktif/nonaktifkan, dan hapus connector NQRust Hypervisor."
weight = 34
date = 2026-04-23

[extra]
toc = true
+++

Halaman `/connectors` adalah pusat operasi connector InfraWatch.

> 📸 **Screenshot needed:** `/images/connectors/list.png`
> **Page to capture:** `/connectors`
> **What to show:** Tampilan daftar dengan kartu statistik, status chip, dan kolom cakupan connector.

---

## Membuat

Klik **Add Connector** lalu kirim payload:

```json
{
  "connectorType": "nqrust_hypervisor",
  "name": "NQRust Production",
  "baseUrl": "https://example/api/v1/...",
  "authMode": "bearer",
  "bearerToken": "...",
  "environment": "production",
  "site": "dc-a",
  "datacenter": "rack-1",
  "insecureTls": true,
  "notes": "optional"
}
```

InfraWatch mengenkripsi kredensial, menulis audit (`connector.create`), lalu menginvalidasi cache `live:`.

> 📸 **Screenshot needed:** `/images/connectors/add-dialog.png`
> **Page to capture:** `/connectors` (klik **Add Connector**)
> **What to show:** Form Add Connector terisi untuk endpoint NQRust Hypervisor sebelum disimpan.

---

## Mengedit

Buka `/connectors/{id}`, klik **Edit**, dan patch field yang berubah.
Jika field auth dikirim, secret akan dienkripsi ulang.

> 📸 **Screenshot needed:** `/images/connectors/edit-dialog.png`
> **Page to capture:** `/connectors/{id}` (klik **Edit**)
> **What to show:** Side-sheet Edit dengan nilai connector yang sudah terisi.

---

## Menguji

**Test Connection** memanggil:

```http
POST /api/connectors/{id}/test
```

Backend mendekripsi auth tersimpan, menjalankan `sum(up)`, lalu mengembalikan status dan latensi.

---

## Aktif dan nonaktif

Connector yang dinonaktifkan tetap menyimpan kredensial terenkripsi, tetapi tidak dipakai agregasi live sampai diaktifkan lagi.

---

## Menghapus

Delete menghapus record connector secara permanen dan mencatat `connector.delete` di audit log.

> 📸 **Screenshot needed:** `/images/connectors/row-actions.png`
> **Page to capture:** `/connectors` (hover baris connector)
> **What to show:** State hover yang menampilkan aksi delete dan open-details.

> 📸 **Screenshot needed:** `/images/connectors/delete-confirm.png`
> **Page to capture:** `/connectors` (klik delete pada baris)
> **What to show:** Popup konfirmasi sebelum penghapusan connector.

---

## Enkripsi

Kredensial connector disimpan di `secret_enc`, terenkripsi AES-256-GCM dengan kunci dari `CONNECTOR_ENCRYPTION_KEY`.

---

## File sumber

- `app/connectors/page.tsx`
- `app/connectors/[id]/page.tsx`
- `app/api/connectors/route.ts`
- `app/api/connectors/[id]/route.ts`
- `app/api/connectors/[id]/test/route.ts`
- `lib/server/connectors-store.ts`
- `lib/server/encryption.ts`

---

## Terkait

- [Ringkasan connectors](../)
- [NQRust Hypervisor](../nqrust-hypervisor/)
- [Fleet & Monitoring](../../fleet/)
- [API Reference > Connectors](../../api-reference/#connectors)
