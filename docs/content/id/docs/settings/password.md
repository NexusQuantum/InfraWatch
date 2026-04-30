+++
title = "Password & Encryption Key"
description = "Rotasi password admin, CONNECTOR_ENCRYPTION_KEY yang melindungi kredensial connector dan secret SSO, dan reset session"
weight = 63
date = 2026-04-23

[extra]
toc = true
+++

Dua secret mendasari setiap operasi terautentikasi di InfraWatch:

1. **Password admin** — dipakai untuk login sebagai administrator lokal.
2. **`CONNECTOR_ENCRYPTION_KEY`** — dipakai untuk mengenkripsi AES-256-GCM setiap kredensial connector dan setiap client secret SSO saat disimpan.

Halaman ini menjelaskan cara merotasi masing-masing dan cara memaksa semua session aktif untuk sign out setelahnya.

---

## Mengubah Password Admin

Baris pengguna admin di `admin_user` di-seed dari `ADMIN_USERNAME` / `ADMIN_PASSWORD` pada boot pertama (lihat [Autentikasi](../authentication/)). Setelah itu, baris tersebut menjadi sumber kebenaran — mengubah env var saja **tidak** akan mengubah password live.

Saat ini tidak ada UI "change password" di `/settings` (form di `app/settings/page.tsx` adalah placeholder). Rotasi password dengan salah satu dari dua jalur ini:

### Opsi 1 — Re-seed dari env var

1. Hentikan InfraWatch (`sudo systemctl stop infrawatch`).
2. Hapus baris admin: `psql -U infrawatch -d infrawatch -c "DELETE FROM admin_user;"`.
3. Edit `/opt/infrawatch/.env` dan set `ADMIN_PASSWORD` baru.
4. Jalankan InfraWatch (`sudo systemctl start infrawatch`). `ensureAdminUser()` di `lib/server/auth.ts` akan me-re-seed baris dengan hash scrypt yang baru.

### Opsi 2 — Perbarui hash secara langsung

Hasilkan hash scrypt dengan algoritma yang sama seperti yang dipakai di `lib/server/auth.ts` (`hashPassword()`):

```js
// node --experimental-repl-await
const { scryptSync, randomBytes } = require("node:crypto");
const plain = "new-secure-password";
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(plain, salt, 64).toString("hex");
console.log(`${salt}:${hash}`);
```

Lalu perbarui baris:

```sql
UPDATE admin_user
SET password_hash = '<paste salt:hash here>', updated_at = NOW()
WHERE username = 'admin';
```

Kedua jalur membiarkan tabel `sessions` tidak tersentuh — lihat **Memaksa Reset Session** di bawah untuk mencabut login live.

{{% alert icon="⚠️" context="warning" %}}
Pilih password minimal 16 karakter yang mencampur huruf besar/kecil/digit/simbol. Scrypt memang lambat by design, tetapi password yang lemah tetap kalah terhadap cluster GPU besar. Jika provider SSO diaktifkan ([SSO](../sso/)), pertimbangkan juga untuk mengeluarkan admin lokal dari rotasi harian dan menyimpannya hanya untuk break-glass.
{{% /alert %}}

---

## Merotasi `CONNECTOR_ENCRYPTION_KEY`

`CONNECTOR_ENCRYPTION_KEY` dibaca oleh `getEncryptionKey()` di `lib/server/encryption.ts`. String mentah di-hash SHA-256 untuk menghasilkan key AES-256-GCM 32-byte yang dipakai oleh `encryptString()` dan `decryptString()`.

Key ini melindungi:

- Setiap kredensial connector NQRust Hypervisor (auth token, API key, dan password basic-auth).
- Cert signing IdP SAML yang disimpan di `sso_config.saml_idp_cert_enc`.
- Client secret OIDC yang disimpan di `sso_config.oidc_client_secret_enc`.

### Persyaratan Production

`getEncryptionKey()` menegakkan dua aturan ketika `NODE_ENV=production`:

- Key tidak boleh sama dengan default dev `local-dev-connector-key-change-me`.
- Key minimal 16 karakter.

Installer menghasilkan nilai acak selama fase Configuration dan menuliskannya ke `/opt/infrawatch/.env`. Nilai yang sama dirujuk dari konvensi `.env.example` di bawah.

{{% alert icon="⚠️" context="warning" %}}
Gunakan **32 karakter acak atau lebih** untuk key ini di production. 16 adalah minimum yang ditegakkan kode; 32+ adalah panjang yang direkomendasikan. Hasilkan dengan `openssl rand -base64 32` atau `head -c 32 /dev/urandom | base64`.
{{% /alert %}}

### Prosedur Rotasi

Karena setiap nilai terenkripsi adalah AES-GCM dengan IV + auth tag tertanam, Anda tidak bisa begitu saja menukar key tanpa membungkus ulang setiap secret. Prosedur downtime minimum adalah:

1. **Inventarisasi** setiap secret terenkripsi yang harus Anda masukkan ulang:
   - Semua kredensial connector (`/connectors` → setiap connector memiliki aksi **Edit credentials**).
   - Cert IdP SAML (`/settings` → SSO → SAML → paste ulang PEM).
   - Client secret OIDC (`/settings` → SSO → OIDC → masukkan ulang secret).
2. **Hentikan InfraWatch:** `sudo systemctl stop infrawatch`.
3. **Backup database:** `pg_dump infrawatch > infrawatch-before-key-rotation.sql`.
4. **Set key baru** di `/opt/infrawatch/.env` (`CONNECTOR_ENCRYPTION_KEY=<new-32+-char-value>`).
5. **Kosongkan kolom terenkripsi** (paling sederhana; menghindari error ciphertext-di-bawah-key-yang-salah):
   ```sql
   UPDATE connectors SET credentials_encrypted = NULL;
   UPDATE sso_config SET saml_idp_cert_enc = NULL, oidc_client_secret_enc = NULL;
   ```
6. **Jalankan InfraWatch:** `sudo systemctl start infrawatch`.
7. **Masukkan ulang setiap secret** via UI. Setiap save menulis ciphertext baru menggunakan key baru.
8. **Verifikasi** connector menampilkan health hijau dan login SSO masih bekerja end-to-end.

Tidak ada migrasi "re-wrap with new key" bawaan. Jika Anda memerlukan zero downtime, tulis script yang memanggil `decryptString()` setiap baris dengan key **lama**, lalu `encryptString()` dengan key **baru** — kedua fungsi ada di `lib/server/encryption.ts` dan bersifat pure.

---

## Konvensi `.env.example`

InfraWatch mengikuti konvensi `.env.example` Next.js standar — repository mengirim `.env.example` dengan setiap variabel yang dapat disetel didokumentasikan, dan installer menghasilkan `.env` sungguhan di `/opt/infrawatch/.env` dengan key yang sama (lihat `installer/src/installer/config.rs`). Key yang relevan untuk halaman ini:

```bash
# Required in production, must be 16+ chars (32+ recommended)
CONNECTOR_ENCRYPTION_KEY=change-me-to-a-strong-random-value

# Seeded into admin_user on first boot; change immediately after install
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change-me-immediately

# Used to build SSO callback URLs and to decide cookie `secure` flag
APP_URL=http://<host>:3001
```

{{% alert icon="⚠️" context="warning" %}}
**Jangan pernah commit `.env` ke version control.** Tambahkan ke `.gitignore` (sudah ada di repo InfraWatch). `.env.example` hanya template dan harus berisi placeholder, bukan nilai sebenarnya. Segera rotasi jika key asli pernah masuk ke sebuah commit.
{{% /alert %}}

---

## Memaksa Reset Session

Merotasi password tidak meng-invalidasi cookie session yang sudah ada — mereka tetap valid sampai stempel `expires_at` 30-hari terlewati. Untuk memaksa setiap klien sign in lagi:

```sql
DELETE FROM sessions;
```

Setiap request setelah itu akan gagal pemeriksaan `validateSession()` di `lib/server/auth.ts` dan di-redirect ke `/login` oleh middleware. Cookie CSRF akan diterbitkan ulang pada login sukses berikutnya.

Jika Anda hanya ingin sign out *diri sendiri*, `POST /api/auth/logout` sudah cukup — ia menghapus baris tunggal untuk token Anda dan membersihkan kedua cookie.

---

## Terkait

- [Aktivasi Lisensi](../../getting-started/license/)
- [API Reference — Auth](../../api-reference/#auth)
- [Arsitektur](../../architecture/)
