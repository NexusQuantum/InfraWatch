# NQRust Licensing Implementation Guide

> **For developers integrating NQRust licensing into applications that do NOT use Ant Design (antd).**
> This guide is framework-agnostic. Examples use vanilla HTML/CSS and plain JavaScript/TypeScript so you can adapt to React, Vue, Svelte, Angular, or any stack.

---

## Table of Contents

1. [Overview](#1-overview)
2. [License Server API Reference](#2-license-server-api-reference)
3. [Backend Implementation](#3-backend-implementation)
4. [Frontend Implementation (No antd)](#4-frontend-implementation-no-antd)
5. [EULA Implementation](#5-eula-implementation)
6. [Offline License (.lic File) Support](#6-offline-license-lic-file-support)
7. [Grace Period & Caching](#7-grace-period--caching)
8. [Middleware / Route Guards](#8-middleware--route-guards)
9. [Environment Variables](#9-environment-variables)
10. [Security Checklist](#10-security-checklist)
11. [Complete Integration Examples](#11-complete-integration-examples)

---

## 1. Overview

### How NQRust Licensing Works

```
┌──────────────┐     License Key      ┌──────────────────┐
│  Your App    │ ───────────────────►  │  NQRust License  │
│  (Client)    │                       │  Server           │
│              │ ◄─────────────────── │  billing.nexus    │
│              │   Verification Result │  quantumtech.id  │
└──────────────┘                       └──────────────────┘
       │
       │  3-Tier Fallback:
       │  1. Online verification (license server)
       │  2. Offline .lic file (RSA signature)
       │  3. Cached DB + grace period
       │
       ▼
  ┌──────────┐
  │ Database │  (Cache last verification)
  └──────────┘
```

### License Key Format

```
XXXX-XXXX-XXXX-XXXX
```

Four groups of 4 alphanumeric characters, separated by dashes.

---

## 2. License Server API Reference

### Base URL

```
https://billing.nexusquantum.id
```

### Verify License

```
POST /api/v1/licenses/verify
```

**Headers:**
```
Authorization: Bearer <LICENSE_API_KEY>
Content-Type: application/json
```

**Request Body:**
```json
{
  "licenseKey": "ABCD-EFGH-IJKL-MNOP",
  "deviceId": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  "deviceName": "Your App Name"
}
```

**Success Response (200):**
```json
{
  "valid": true,
  "license": {
    "key": "ABCD-EFGH-IJKL-MNOP",
    "status": "active",
    "product": "NQRust Platform",
    "productId": "prod_xxx",
    "customer": "Acme Corp",
    "customerId": "cust_xxx",
    "features": ["analytics", "dashboards"],
    "createdAt": "2025-01-01",
    "expiresAt": "2026-01-01"
  },
  "activations": 2,
  "maxActivations": 5
}
```

**Error Response (200 with valid=false):**
```json
{
  "valid": false,
  "error": "license_expired",
  "message": "License has expired"
}
```

Possible `error` values: `license_expired`, `invalid_license`, `max_activations_reached`, `license_revoked`.

---

## 3. Backend Implementation

### 3.1 Device ID Generation

Generate a stable, unique identifier for the machine. This is sent to the license server to track activations.

**Node.js / TypeScript:**
```typescript
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

function generateDeviceId(): string {
  const info = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
  ].join('|');

  return crypto.createHash('sha256').update(info).digest('hex').slice(0, 32);
}

function getOrCreateDeviceId(dataDir: string): string {
  const idFile = path.join(dataDir, '.device-id');

  try {
    const existing = fs.readFileSync(idFile, 'utf-8').trim();
    if (existing) return existing;
  } catch {
    // File doesn't exist, generate new
  }

  const deviceId = generateDeviceId();
  fs.mkdirSync(path.dirname(idFile), { recursive: true });
  fs.writeFileSync(idFile, deviceId, 'utf-8');
  return deviceId;
}
```

**Python:**
```python
import hashlib
import os
import platform
import subprocess

def generate_device_id() -> str:
    cpu_model = ""
    try:
        if platform.system() == "Linux":
            cpu_model = subprocess.check_output(
                ["grep", "-m1", "model name", "/proc/cpuinfo"],
                text=True
            ).split(":")[1].strip()
        elif platform.system() == "Darwin":
            cpu_model = subprocess.check_output(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                text=True
            ).strip()
    except Exception:
        pass

    info = "|".join([
        platform.node(),      # hostname
        platform.system(),    # platform
        platform.machine(),   # arch
        cpu_model,
    ])

    return hashlib.sha256(info.encode()).hexdigest()[:32]

def get_or_create_device_id(data_dir: str) -> str:
    id_file = os.path.join(data_dir, ".device-id")

    try:
        with open(id_file, "r") as f:
            existing = f.read().strip()
            if existing:
                return existing
    except FileNotFoundError:
        pass

    device_id = generate_device_id()
    os.makedirs(os.path.dirname(id_file), exist_ok=True)
    with open(id_file, "w") as f:
        f.write(device_id)
    return device_id
```

**Go:**
```go
package license

import (
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "os"
    "path/filepath"
    "runtime"
    "strings"
)

func generateDeviceID() string {
    hostname, _ := os.Hostname()
    info := strings.Join([]string{
        hostname,
        runtime.GOOS,
        runtime.GOARCH,
        getCPUModel(), // implement per-platform
    }, "|")

    hash := sha256.Sum256([]byte(info))
    return hex.EncodeToString(hash[:])[:32]
}

func GetOrCreateDeviceID(dataDir string) (string, error) {
    idFile := filepath.Join(dataDir, ".device-id")

    data, err := os.ReadFile(idFile)
    if err == nil {
        existing := strings.TrimSpace(string(data))
        if existing != "" {
            return existing, nil
        }
    }

    deviceID := generateDeviceID()
    os.MkdirAll(filepath.Dir(idFile), 0755)
    os.WriteFile(idFile, []byte(deviceID), 0600)
    return deviceID, nil
}
```

### 3.2 License Verification Service

**Node.js / TypeScript (framework-agnostic):**

```typescript
// licenseService.ts

interface LicenseState {
  isLicensed: boolean;
  status: 'active' | 'expired' | 'invalid' | 'grace_period' | 'unlicensed' | 'unknown';
  isGracePeriod: boolean;
  graceDaysRemaining: number | null;
  customerName: string | null;
  product: string | null;
  features: string[];
  expiresAt: string | null;
  activations: number | null;
  maxActivations: number | null;
  verifiedAt: string | null;
  licenseKey: string | null;   // masked: XXXX-****-****-XXXX
  errorMessage: string | null;
}

interface LicenseConfig {
  licenseKey?: string;
  licenseServerUrl: string;       // default: https://billing.nexusquantum.id
  licenseApiKey: string;
  licenseGracePeriodDays: number; // default: 7
  licensePublicKey?: string;      // RSA PEM for offline verification
  persistDir: string;             // directory for .device-id, .license-key
}

const UNLICENSED: LicenseState = {
  isLicensed: false,
  status: 'unlicensed',
  isGracePeriod: false,
  graceDaysRemaining: null,
  customerName: null,
  product: null,
  features: [],
  expiresAt: null,
  activations: null,
  maxActivations: null,
  verifiedAt: null,
  licenseKey: null,
  errorMessage: null,
};

class LicenseService {
  private config: LicenseConfig;
  private deviceId: string;
  private cachedState: LicenseState = { ...UNLICENSED };

  constructor(config: LicenseConfig) {
    this.config = config;
    this.deviceId = getOrCreateDeviceId(config.persistDir);
    this.loadPersistedKey();
  }

  // --- Key Persistence ---

  private loadPersistedKey(): void {
    const keyFile = path.join(this.config.persistDir, '.license-key');
    try {
      const key = fs.readFileSync(keyFile, 'utf-8').trim();
      if (key) this.config.licenseKey = key;
    } catch { /* no persisted key */ }
  }

  private persistKey(key: string): void {
    const keyFile = path.join(this.config.persistDir, '.license-key');
    fs.mkdirSync(path.dirname(keyFile), { recursive: true });
    fs.writeFileSync(keyFile, key, 'utf-8');
  }

  // --- Public Methods ---

  getLicenseState(): LicenseState {
    return { ...this.cachedState };
  }

  getFeatures(): string[] {
    return [...this.cachedState.features];
  }

  async activateLicenseKey(licenseKey: string): Promise<LicenseState> {
    this.config.licenseKey = licenseKey;
    const state = await this.verifyOnline(licenseKey);

    if (state.isLicensed) {
      this.persistKey(licenseKey);
      // Save to your database here (see Section 3.3)
    }

    this.cachedState = state;
    return state;
  }

  async checkLicense(): Promise<LicenseState> {
    const key = this.config.licenseKey;
    if (!key) {
      this.cachedState = { ...UNLICENSED };
      return this.cachedState;
    }

    // Tier 1: Online verification
    try {
      const state = await this.verifyOnline(key);
      this.cachedState = state;
      // Save to DB on success
      return state;
    } catch (err) {
      console.warn('Online verification failed:', err);
    }

    // Tier 2: Offline .lic file (see Section 6)

    // Tier 3: Cached DB with grace period (see Section 7)

    return this.cachedState;
  }

  // --- Online Verification ---

  private async verifyOnline(licenseKey: string): Promise<LicenseState> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(
        `${this.config.licenseServerUrl}/api/v1/licenses/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.licenseApiKey}`,
          },
          body: JSON.stringify({
            licenseKey,
            deviceId: this.deviceId,
            deviceName: 'Your App Name', // <-- Replace with your app name
          }),
          signal: controller.signal,
        }
      );

      const data = await res.json();

      if (data.valid && data.license) {
        return {
          isLicensed: true,
          status: 'active',
          isGracePeriod: false,
          graceDaysRemaining: null,
          customerName: data.license.customer,
          product: data.license.product,
          features: data.license.features || [],
          expiresAt: data.license.expiresAt,
          activations: data.activations ?? null,
          maxActivations: data.maxActivations ?? null,
          verifiedAt: new Date().toISOString(),
          licenseKey: this.maskKey(licenseKey),
          errorMessage: null,
        };
      }

      return {
        ...UNLICENSED,
        status: data.error === 'license_expired' ? 'expired' : 'invalid',
        licenseKey: this.maskKey(licenseKey),
        errorMessage: data.message || data.error || 'Verification failed',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private maskKey(key: string): string {
    const parts = key.split('-');
    if (parts.length !== 4) return '****';
    return `${parts[0]}-****-****-${parts[3]}`;
  }
}
```

### 3.3 Database Schema

Create a table to cache the last license verification result. This is used for the grace period fallback.

**SQL (works with SQLite, PostgreSQL, MySQL):**
```sql
CREATE TABLE license (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key    VARCHAR(255) NOT NULL,
  status         VARCHAR(50)  NOT NULL DEFAULT 'unknown',
  customer_name  VARCHAR(255),
  product        VARCHAR(255),
  product_id     VARCHAR(255),
  customer_id    VARCHAR(255),
  features       TEXT,           -- JSON array as string: '["analytics","export"]'
  expires_at     VARCHAR(30),    -- ISO date: "2026-01-01"
  verified_at    VARCHAR(50),    -- ISO timestamp
  activations    INTEGER,
  max_activations INTEGER,
  cached_response TEXT,          -- Full JSON response from server
  device_id      VARCHAR(64),
  is_offline     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Knex.js Migration:**
```javascript
exports.up = function (knex) {
  return knex.schema.createTable('license', (table) => {
    table.increments('id').primary();
    table.string('license_key', 255).notNullable();
    table.string('status', 50).notNullable().defaultTo('unknown');
    table.string('customer_name', 255);
    table.string('product', 255);
    table.string('product_id', 255);
    table.string('customer_id', 255);
    table.text('features');
    table.string('expires_at', 30);
    table.string('verified_at', 50);
    table.integer('activations');
    table.integer('max_activations');
    table.text('cached_response');
    table.string('device_id', 64);
    table.boolean('is_offline').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('license');
};
```

---

## 4. Frontend Implementation (No antd)

### 4.1 License Activation Page (Plain HTML/CSS + JS)

This is a **framework-agnostic** example. Adapt to your component system (React, Vue, Svelte, etc.).

```html
<!-- license-setup.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>License Activation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .license-container {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
      padding: 40px;
      width: 100%;
      max-width: 480px;
    }

    .license-container h1 {
      font-size: 24px;
      margin-bottom: 8px;
      color: #1a1a1a;
    }

    .license-container p.subtitle {
      color: #666;
      margin-bottom: 24px;
      font-size: 14px;
    }

    /* Tab switcher */
    .tab-group {
      display: flex;
      border-bottom: 2px solid #e8e8e8;
      margin-bottom: 24px;
    }

    .tab-group button {
      flex: 1;
      padding: 10px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.2s;
    }

    .tab-group button.active {
      color: #1677ff;
      border-bottom-color: #1677ff;
      font-weight: 600;
    }

    /* License key input */
    .license-key-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      font-size: 16px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      letter-spacing: 2px;
      text-align: center;
      transition: border-color 0.2s;
    }

    .license-key-input:focus {
      outline: none;
      border-color: #1677ff;
      box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.1);
    }

    .license-key-input::placeholder {
      letter-spacing: 1px;
      color: #bbb;
    }

    /* File upload area */
    .file-upload-area {
      border: 2px dashed #d9d9d9;
      border-radius: 8px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      color: #666;
    }

    .file-upload-area:hover {
      border-color: #1677ff;
      background: #f0f5ff;
    }

    .file-upload-area.dragging {
      border-color: #1677ff;
      background: #e6f4ff;
    }

    .file-upload-area input[type="file"] {
      display: none;
    }

    /* Buttons */
    .btn-primary {
      width: 100%;
      padding: 12px;
      background: #1677ff;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      transition: background 0.2s;
    }

    .btn-primary:hover { background: #4096ff; }
    .btn-primary:disabled { background: #bbb; cursor: not-allowed; }

    /* Status messages */
    .status-message {
      margin-top: 16px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      display: none;
    }

    .status-message.error {
      display: block;
      background: #fff2f0;
      border: 1px solid #ffccc7;
      color: #cf1322;
    }

    .status-message.success {
      display: block;
      background: #f6ffed;
      border: 1px solid #b7eb8f;
      color: #389e0d;
    }

    .status-message.warning {
      display: block;
      background: #fffbe6;
      border: 1px solid #ffe58f;
      color: #d48806;
    }

    /* License info card */
    .license-info {
      margin-top: 24px;
      padding: 16px;
      background: #f6ffed;
      border-radius: 8px;
      border: 1px solid #b7eb8f;
    }

    .license-info .row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 14px;
    }

    .license-info .row .label { color: #666; }
    .license-info .row .value { font-weight: 600; color: #1a1a1a; }

    /* Hidden panel */
    .panel { display: none; }
    .panel.active { display: block; }
  </style>
</head>
<body>
  <div class="license-container">
    <h1>Activate License</h1>
    <p class="subtitle">Enter your license key or upload an offline license file.</p>

    <div class="tab-group">
      <button class="active" onclick="switchTab('key')">License Key</button>
      <button onclick="switchTab('file')">Offline File</button>
    </div>

    <!-- Tab 1: License Key -->
    <div id="panel-key" class="panel active">
      <input
        type="text"
        class="license-key-input"
        id="licenseKeyInput"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxlength="19"
        autocomplete="off"
        spellcheck="false"
      />
      <button class="btn-primary" id="activateBtn" onclick="activateKey()">
        Activate License
      </button>
    </div>

    <!-- Tab 2: Offline File -->
    <div id="panel-file" class="panel">
      <div class="file-upload-area" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <p><strong>Click to select</strong> or drag & drop</p>
        <p style="margin-top: 8px; font-size: 12px; color: #999">Accepts .lic files</p>
        <input type="file" id="fileInput" accept=".lic" onchange="handleFileSelect(event)" />
      </div>
      <div id="fileName" style="margin-top: 8px; font-size: 13px; color: #666"></div>
      <button class="btn-primary" id="uploadBtn" onclick="uploadFile()" disabled>
        Upload & Activate
      </button>
    </div>

    <!-- Status messages -->
    <div id="statusMessage" class="status-message"></div>

    <!-- License info (shown after successful activation) -->
    <div id="licenseInfo" class="license-info" style="display:none">
      <div class="row"><span class="label">Status</span><span class="value" id="infoStatus"></span></div>
      <div class="row"><span class="label">Customer</span><span class="value" id="infoCustomer"></span></div>
      <div class="row"><span class="label">Product</span><span class="value" id="infoProduct"></span></div>
      <div class="row"><span class="label">Expires</span><span class="value" id="infoExpires"></span></div>
      <div class="row"><span class="label">Activations</span><span class="value" id="infoActivations"></span></div>
    </div>
  </div>

  <script>
    // ------------------------------------------------------------------
    // Tab switching
    // ------------------------------------------------------------------
    function switchTab(tab) {
      document.querySelectorAll('.tab-group button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById(`panel-${tab}`).classList.add('active');
    }

    // ------------------------------------------------------------------
    // Auto-format license key: XXXX-XXXX-XXXX-XXXX
    // ------------------------------------------------------------------
    const keyInput = document.getElementById('licenseKeyInput');
    keyInput.addEventListener('input', function (e) {
      let raw = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      let formatted = raw.match(/.{1,4}/g)?.join('-') || '';
      this.value = formatted.slice(0, 19); // max XXXX-XXXX-XXXX-XXXX
    });

    // ------------------------------------------------------------------
    // Activate via license key
    // ------------------------------------------------------------------
    async function activateKey() {
      const key = keyInput.value.trim();
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
        showStatus('error', 'Invalid format. Use XXXX-XXXX-XXXX-XXXX.');
        return;
      }

      const btn = document.getElementById('activateBtn');
      btn.disabled = true;
      btn.textContent = 'Activating...';

      try {
        // ------- ADAPT THIS TO YOUR API -------
        const res = await fetch('/api/license/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseKey: key }),
        });
        const data = await res.json();
        // --------------------------------------

        if (data.isLicensed) {
          showStatus('success', 'License activated successfully!');
          showLicenseInfo(data);
          // Redirect to main app after a short delay
          setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
          showStatus('error', data.errorMessage || 'Activation failed.');
        }
      } catch (err) {
        showStatus('error', `Network error: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Activate License';
      }
    }

    // ------------------------------------------------------------------
    // File upload
    // ------------------------------------------------------------------
    let selectedFile = null;

    function handleFileSelect(event) {
      selectedFile = event.target.files[0];
      if (selectedFile) {
        document.getElementById('fileName').textContent = selectedFile.name;
        document.getElementById('uploadBtn').disabled = false;
      }
    }

    // Drag and drop
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragging'); });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragging');
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.lic')) {
        selectedFile = file;
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('uploadBtn').disabled = false;
      } else {
        showStatus('error', 'Please upload a .lic file.');
      }
    });

    async function uploadFile() {
      if (!selectedFile) return;

      const btn = document.getElementById('uploadBtn');
      btn.disabled = true;
      btn.textContent = 'Uploading...';

      try {
        const content = await selectedFile.text();

        // ------- ADAPT THIS TO YOUR API -------
        const res = await fetch('/api/license/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: content }),
        });
        const data = await res.json();
        // --------------------------------------

        if (data.isLicensed) {
          showStatus('success', 'Offline license activated!');
          showLicenseInfo(data);
          setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
          showStatus('error', data.errorMessage || 'Invalid license file.');
        }
      } catch (err) {
        showStatus('error', `Upload failed: ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Upload & Activate';
      }
    }

    // ------------------------------------------------------------------
    // UI Helpers
    // ------------------------------------------------------------------
    function showStatus(type, message) {
      const el = document.getElementById('statusMessage');
      el.className = `status-message ${type}`;
      el.textContent = message;
    }

    function showLicenseInfo(state) {
      document.getElementById('licenseInfo').style.display = 'block';
      document.getElementById('infoStatus').textContent = state.status;
      document.getElementById('infoCustomer').textContent = state.customerName || '-';
      document.getElementById('infoProduct').textContent = state.product || '-';
      document.getElementById('infoExpires').textContent = state.expiresAt || 'Never';
      document.getElementById('infoActivations').textContent =
        `${state.activations ?? '-'} / ${state.maxActivations ?? '-'}`;
    }
  </script>
</body>
</html>
```

### 4.2 React Example (No antd)

```tsx
// LicenseActivation.tsx
import { useState, FormEvent } from 'react';

interface LicenseState {
  isLicensed: boolean;
  status: string;
  customerName: string | null;
  product: string | null;
  expiresAt: string | null;
  activations: number | null;
  maxActivations: number | null;
  errorMessage: string | null;
}

export function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LicenseState | null>(null);

  // Auto-format key input
  function handleKeyChange(value: string) {
    const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const formatted = raw.match(/.{1,4}/g)?.join('-') || '';
    setLicenseKey(formatted.slice(0, 19));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
      setError('Invalid format. Use XXXX-XXXX-XXXX-XXXX.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });
      const data: LicenseState = await res.json();

      if (data.isLicensed) {
        setResult(data);
        setTimeout(() => { window.location.href = '/'; }, 1500);
      } else {
        setError(data.errorMessage || 'Activation failed.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: 40, background: '#fff', borderRadius: 12, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Activate License</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={licenseKey}
          onChange={(e) => handleKeyChange(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
          style={{ width: '100%', padding: '12px 16px', border: '1px solid #d9d9d9', borderRadius: 8, fontSize: 16, fontFamily: 'monospace', textAlign: 'center', letterSpacing: 2 }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 12, marginTop: 20, background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
        >
          {loading ? 'Activating...' : 'Activate License'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 8, color: '#cf1322' }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16, padding: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8 }}>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Customer:</strong> {result.customerName}</p>
          <p><strong>Expires:</strong> {result.expiresAt}</p>
        </div>
      )}
    </div>
  );
}
```

### 4.3 Vue Example

```vue
<!-- LicenseActivation.vue -->
<template>
  <div class="license-container">
    <h1>Activate License</h1>

    <form @submit.prevent="activate">
      <input
        v-model="formattedKey"
        @input="formatKey"
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxlength="19"
        class="license-input"
      />
      <button type="submit" :disabled="loading" class="btn-primary">
        {{ loading ? 'Activating...' : 'Activate License' }}
      </button>
    </form>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="result?.isLicensed" class="alert success">
      License activated! Redirecting...
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const formattedKey = ref('');
const loading = ref(false);
const error = ref<string | null>(null);
const result = ref<any>(null);

function formatKey(e: Event) {
  const raw = (e.target as HTMLInputElement).value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  formattedKey.value = (raw.match(/.{1,4}/g)?.join('-') || '').slice(0, 19);
}

async function activate() {
  error.value = null;
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(formattedKey.value)) {
    error.value = 'Invalid format.';
    return;
  }

  loading.value = true;
  try {
    const res = await fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: formattedKey.value }),
    });
    result.value = await res.json();

    if (result.value.isLicensed) {
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } else {
      error.value = result.value.errorMessage || 'Activation failed.';
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>
```

---

## 5. EULA Implementation

### 5.1 How It Works

The EULA must be accepted **before** the license activation page is shown. The acceptance is stored client-side and version-tracked so users re-accept when the EULA changes.

```
App Start
  ↓
Check localStorage for EULA version
  ↓ (not accepted or version mismatch)
Show EULA page → User accepts → Store version in localStorage
  ↓ (accepted)
Show License Activation page (or main app if already licensed)
```

### 5.2 EULA Version Tracking

```javascript
const EULA_VERSION = '1.0'; // Bump this when EULA content changes

function isEulaAccepted() {
  return localStorage.getItem('nqrust_eula_accepted') === EULA_VERSION;
}

function acceptEula() {
  localStorage.setItem('nqrust_eula_accepted', EULA_VERSION);
}
```

### 5.3 EULA Component (Plain HTML/JS)

```html
<!-- eula.html -->
<div id="eulaPage" style="display:none">
  <div class="eula-container" style="max-width: 680px; margin: 40px auto; padding: 40px; background: #fff; border-radius: 12px; box-shadow: 0 2px 20px rgba(0,0,0,0.08);">

    <h1 style="margin-bottom: 8px;">End User License Agreement</h1>
    <p style="color: #666; margin-bottom: 16px; font-size: 14px;">
      Please read and accept the agreement before continuing.
    </p>

    <!-- Language selector -->
    <div style="margin-bottom: 16px;">
      <button onclick="setEulaLang('en')" id="langEn" class="lang-btn active">English</button>
      <button onclick="setEulaLang('id')" id="langId" class="lang-btn">Bahasa Indonesia</button>
    </div>

    <!-- EULA content (scrollable) -->
    <div id="eulaContent" style="
      height: 400px;
      overflow-y: auto;
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 20px;
      font-size: 13px;
      line-height: 1.8;
      white-space: pre-wrap;
      background: #fafafa;
    "></div>

    <!-- Accept checkbox -->
    <label style="display: flex; align-items: center; gap: 8px; margin-top: 16px; cursor: pointer;">
      <input type="checkbox" id="eulaCheckbox" onchange="updateAcceptBtn()" />
      <span style="font-size: 14px;">I have read and agree to the End User License Agreement</span>
    </label>

    <button id="eulaAcceptBtn" class="btn-primary" disabled onclick="acceptAndContinue()">
      Accept & Continue
    </button>
  </div>
</div>

<script>
  const EULA_VERSION = '1.0';

  // Your EULA text — store in a constants file or fetch from server
  const EULA_CONTENT = {
    en: `END USER LICENSE AGREEMENT (EULA)
NEXUS QUANTUM TECH
Product: [Your Product Name]

This End User License Agreement ("Agreement") is a legal agreement between the User ("User") and Nexus Quantum Tech as the technology owner and copyright holder of the software.

By installing, accessing, or using this Software, the User is deemed to have read, understood, and agreed to all terms of this Agreement.

ARTICLE 1 – INTELLECTUAL PROPERTY RIGHTS
All copyrights, patents, trade secrets, algorithms, source code, object code, analytic engines, AI models, system designs, documentation, and all components of the Software are the exclusive property of Nexus Quantum Tech.

ARTICLE 2 – LICENSE GRANT
Nexus Quantum Tech grants the User a limited, non-exclusive, non-transferable, and non-sublicensable license to use the Software according to the number of licenses granted.

ARTICLE 3 – INSTALLATION AND ACTIVATION RESTRICTIONS
The Software may only be installed according to the number of valid licenses.
The Software may utilize protection mechanisms such as:
    • License activation
    • Machine fingerprinting
    • Hardware binding
    • License keys
    • Online validation

ARTICLE 4 – PROHIBITION ON PIRACY AND MODIFICATION
The User is strictly prohibited from:
    • Copying, distributing, or sharing the Software without authorization
    • Reverse engineering, decompiling, or disassembling the Software
    • Modifying, adapting, or creating derivative works
    • Removing copy protection or technical safeguards
    • Using the Software for unauthorized benchmarking or competitive analysis

ARTICLE 5 – TERMINATION
This license terminates automatically if:
    • The license subscription expires
    • The User violates any terms of this Agreement
    • The User fails to pay applicable fees

Upon termination the User must cease all use and delete all copies.

ARTICLE 6 – LIABILITY
THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
NEXUS QUANTUM TECH SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.

ARTICLE 7 – GOVERNING LAW
This Agreement is governed by the laws of the Republic of Indonesia.`,

    id: `PERJANJIAN LISENSI PENGGUNA AKHIR (EULA)
NEXUS QUANTUM TECH
Produk: [Nama Produk Anda]

Perjanjian Lisensi Pengguna Akhir ini ("Perjanjian") merupakan perjanjian hukum antara Pengguna ("Pengguna") dan Nexus Quantum Tech selaku pemilik teknologi dan pemegang hak cipta perangkat lunak.

Dengan menginstal, mengakses, atau menggunakan Perangkat Lunak ini, Pengguna dianggap telah membaca, memahami, dan menyetujui seluruh ketentuan dalam Perjanjian ini.

...`, // Full Bahasa Indonesia version
  };

  function setEulaLang(lang) {
    document.getElementById('eulaContent').textContent = EULA_CONTENT[lang];
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(lang === 'en' ? 'langEn' : 'langId').classList.add('active');
  }

  function updateAcceptBtn() {
    document.getElementById('eulaAcceptBtn').disabled =
      !document.getElementById('eulaCheckbox').checked;
  }

  function acceptAndContinue() {
    localStorage.setItem('nqrust_eula_accepted', EULA_VERSION);
    document.getElementById('eulaPage').style.display = 'none';
    showLicensePage(); // Your function to show the license activation UI
  }

  // On page load: check EULA status
  function checkEula() {
    if (localStorage.getItem('nqrust_eula_accepted') !== EULA_VERSION) {
      document.getElementById('eulaPage').style.display = 'block';
      setEulaLang('en');
      return false; // EULA not yet accepted
    }
    return true; // EULA accepted, proceed
  }
</script>
```

### 5.4 React EULA Component

```tsx
// EulaViewer.tsx
import { useState } from 'react';

const EULA_VERSION = '1.0';
const EULA_CONTENT = { en: '...', id: '...' }; // Your EULA text

interface EulaViewerProps {
  onAccept: () => void;
}

export function EulaViewer({ onAccept }: EulaViewerProps) {
  const [lang, setLang] = useState<'en' | 'id'>('en');
  const [agreed, setAgreed] = useState(false);

  function handleAccept() {
    localStorage.setItem('nqrust_eula_accepted', EULA_VERSION);
    onAccept();
  }

  return (
    <div style={{ maxWidth: 680, margin: '40px auto', padding: 40, background: '#fff', borderRadius: 12 }}>
      <h1>End User License Agreement</h1>

      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setLang('en')}
          style={{ fontWeight: lang === 'en' ? 700 : 400 }}
        >English</button>
        <button
          onClick={() => setLang('id')}
          style={{ fontWeight: lang === 'id' ? 700 : 400 }}
        >Bahasa Indonesia</button>
      </div>

      <div style={{
        height: 400, overflowY: 'auto', border: '1px solid #e8e8e8',
        borderRadius: 8, padding: 20, fontSize: 13, lineHeight: 1.8,
        whiteSpace: 'pre-wrap', background: '#fafafa',
      }}>
        {EULA_CONTENT[lang]}
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, cursor: 'pointer' }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        I have read and agree to the End User License Agreement
      </label>

      <button
        disabled={!agreed}
        onClick={handleAccept}
        style={{ width: '100%', padding: 12, marginTop: 20, background: agreed ? '#1677ff' : '#bbb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: agreed ? 'pointer' : 'not-allowed' }}
      >
        Accept & Continue
      </button>
    </div>
  );
}
```

### 5.5 Full EULA + License Setup Flow (React)

```tsx
// SetupPage.tsx — Combines EULA + License activation
import { useState, useEffect } from 'react';
import { EulaViewer } from './EulaViewer';
import { LicenseActivation } from './LicenseActivation';

const EULA_VERSION = '1.0';

type Step = 'eula' | 'license';

export function SetupPage() {
  const [step, setStep] = useState<Step>('eula');

  useEffect(() => {
    // Skip EULA if already accepted
    if (localStorage.getItem('nqrust_eula_accepted') === EULA_VERSION) {
      setStep('license');
    }
  }, []);

  if (step === 'eula') {
    return <EulaViewer onAccept={() => setStep('license')} />;
  }

  return <LicenseActivation />;
}
```

---

## 6. Offline License (.lic File) Support

### 6.1 File Format

```
-----BEGIN LICENSE-----
eyJsaWNlbnNlSWQiOiJsaWNfMTIzIiwiY3VzdG9tZXJJZCI6ImN1c3RfNDU2Ii...
-----END LICENSE-----
-----BEGIN SIGNATURE-----
MEUCIQC8n2r5rG3DfE0bYx7QzP5h0vR4W6K2J...
-----END SIGNATURE-----
```

- The content between `BEGIN LICENSE` and `END LICENSE` is a **base64-encoded JSON** payload.
- The signature is an **RSA signature** of the license payload, verified with the public key.

### 6.2 Parsing & Verification (Node.js)

```typescript
import crypto from 'node:crypto';

interface OfflineLicensePayload {
  licenseId: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  features: string[];
  maxActivations?: number;
  issuedAt: string;   // "YYYY-MM-DD"
  expiresAt: string;  // "YYYY-MM-DD"
}

function parseAndVerifyLicenseFile(
  fileContent: string,
  publicKeyPem: string
): { valid: boolean; payload?: OfflineLicensePayload; error?: string } {

  // 1. Extract sections
  const licenseMatch = fileContent.match(
    /-----BEGIN LICENSE-----\s*([\s\S]*?)\s*-----END LICENSE-----/
  );
  const sigMatch = fileContent.match(
    /-----BEGIN SIGNATURE-----\s*([\s\S]*?)\s*-----END SIGNATURE-----/
  );

  if (!licenseMatch || !sigMatch) {
    return { valid: false, error: 'Invalid license file format' };
  }

  const licenseB64 = licenseMatch[1].replace(/\s/g, '');
  const signatureB64 = sigMatch[1].replace(/\s/g, '');

  // 2. Verify RSA signature
  try {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(licenseB64);

    const isValid = verifier.verify(publicKeyPem, signatureB64, 'base64');
    if (!isValid) {
      return { valid: false, error: 'Invalid signature — file may be tampered' };
    }
  } catch {
    return { valid: false, error: 'Signature verification failed' };
  }

  // 3. Decode payload
  const payloadJson = Buffer.from(licenseB64, 'base64').toString('utf-8');
  const payload: OfflineLicensePayload = JSON.parse(payloadJson);

  // 4. Check expiration
  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt < new Date()) {
    return { valid: false, payload, error: 'License has expired' };
  }

  return { valid: true, payload };
}
```

### 6.3 Backend Upload Endpoint

```typescript
// Express/Fastify/any framework
app.post('/api/license/upload', async (req, res) => {
  const { fileContent } = req.body;

  if (!fileContent) {
    return res.status(400).json({ error: 'No file content provided' });
  }

  // Verify the file
  const result = parseAndVerifyLicenseFile(fileContent, config.licensePublicKey);

  if (!result.valid) {
    return res.json({
      isLicensed: false,
      status: 'invalid',
      errorMessage: result.error,
    });
  }

  // Save the .lic file to disk
  const licPath = path.join(config.persistDir, 'license.lic');
  fs.writeFileSync(licPath, fileContent, 'utf-8');

  // Save to database
  await licenseRepository.upsert({
    licenseKey: result.payload.licenseId,
    status: 'active',
    customerName: result.payload.customerName,
    product: result.payload.productName,
    features: JSON.stringify(result.payload.features),
    expiresAt: result.payload.expiresAt,
    verifiedAt: new Date().toISOString(),
    isOffline: true,
  });

  return res.json({
    isLicensed: true,
    status: 'active',
    customerName: result.payload.customerName,
    product: result.payload.productName,
    features: result.payload.features,
    expiresAt: result.payload.expiresAt,
    errorMessage: null,
  });
});
```

---

## 7. Grace Period & Caching

When both online and offline verification fail, fall back to the last cached result with a grace period.

```typescript
async function checkWithGracePeriod(
  licenseRepository: LicenseRepository,
  gracePeriodDays: number
): Promise<LicenseState> {
  const cached = await licenseRepository.getLatest();
  if (!cached || cached.status !== 'active') {
    return { ...UNLICENSED };
  }

  const verifiedAt = new Date(cached.verifiedAt);
  const now = new Date();
  const daysSinceVerification = Math.floor(
    (now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceVerification <= gracePeriodDays) {
    return {
      isLicensed: true,
      status: 'grace_period',
      isGracePeriod: true,
      graceDaysRemaining: gracePeriodDays - daysSinceVerification,
      customerName: cached.customerName,
      product: cached.product,
      features: JSON.parse(cached.features || '[]'),
      expiresAt: cached.expiresAt,
      activations: cached.activations,
      maxActivations: cached.maxActivations,
      verifiedAt: cached.verifiedAt,
      licenseKey: maskKey(cached.licenseKey),
      errorMessage: null,
    };
  }

  // Grace period expired
  return {
    ...UNLICENSED,
    errorMessage: `Grace period expired. Last verified ${daysSinceVerification} days ago.`,
  };
}
```

### Grace Period Warning Banner

Show a warning banner when the app is in grace period:

```html
<!-- Vanilla HTML -->
<div id="graceBanner" style="
  display: none;
  background: #fffbe6;
  border-bottom: 1px solid #ffe58f;
  padding: 8px 16px;
  text-align: center;
  font-size: 13px;
  color: #d48806;
">
  ⚠ License verification pending. Grace period: <strong id="graceDays"></strong> days remaining.
  <a href="/setup/license">Verify now</a>
</div>

<script>
  // Call on page load
  async function checkGrace() {
    const res = await fetch('/api/license/status');
    const state = await res.json();
    if (state.isGracePeriod) {
      document.getElementById('graceBanner').style.display = 'block';
      document.getElementById('graceDays').textContent = state.graceDaysRemaining;
    }
  }
</script>
```

---

## 8. Middleware / Route Guards

### 8.1 Server-Side Middleware

Protect all routes except public ones. Use cookies or sessions to avoid re-checking on every request.

**Express.js:**
```typescript
// middleware/licenseMiddleware.ts
import { Request, Response, NextFunction } from 'express';

const PUBLIC_PATHS = [
  '/setup',
  '/api/license',
  '/login',
  '/register',
  '/favicon.ico',
  '/static',
];

export function licenseMiddleware(licenseService: LicenseService) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Allow public paths
    if (PUBLIC_PATHS.some(p => req.path.startsWith(p))) {
      return next();
    }

    // Check cookie first (fast path)
    if (req.cookies?.nqrust_license_status === 'valid') {
      return next();
    }

    // Verify license state
    const state = licenseService.getLicenseState();
    if (state.isLicensed) {
      // Set cookie for 24 hours
      res.cookie('nqrust_license_status', 'valid', {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });
      return next();
    }

    // Not licensed — redirect or return 403
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        error: 'license_required',
        message: 'A valid license is required to use this API',
        status: state.status,
      });
    }

    // Redirect HTML pages to setup
    return res.redirect('/setup/license');
  };
}

// Usage:
// app.use(licenseMiddleware(licenseService));
```

**Next.js Middleware:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/setup/license', '/api/license', '/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths and static assets
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check license cookie
  const licenseStatus = request.cookies.get('nqrust_license_status');
  if (licenseStatus?.value !== 'valid') {
    return NextResponse.redirect(new URL('/setup/license', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### 8.2 Client-Side Route Guard

Periodic re-verification on the client side:

```typescript
// LicenseGuard.tsx (React)
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router'; // or your router

const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SKIP_PATHS = ['/setup/license', '/login', '/register'];

export function LicenseGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout>();

  async function verifyLicense() {
    if (SKIP_PATHS.includes(router.pathname)) return;

    try {
      const res = await fetch('/api/license/status');
      const state = await res.json();
      if (!state.isLicensed) {
        router.push('/setup/license');
      }
    } catch {
      // Network error — don't redirect (grace period handles this)
    }
  }

  useEffect(() => {
    verifyLicense();
    intervalRef.current = setInterval(verifyLicense, CHECK_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [router.pathname]);

  return <>{children}</>;
}

// Usage in _app.tsx or layout:
// <LicenseGuard><Component {...pageProps} /></LicenseGuard>
```

---

## 9. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LICENSE_SERVER_URL` | No | `https://billing.nexusquantum.id` | NQRust license server URL |
| `LICENSE_API_KEY` | **Yes** | — | Bearer token for license server API |
| `LICENSE_KEY` | No | — | Pre-configured license key (can also be set via UI) |
| `LICENSE_FILE_PATH` | No | — | Path to offline `.lic` file |
| `LICENSE_GRACE_PERIOD_DAYS` | No | `7` | Days to allow access after verification failure |
| `LICENSE_PUBLIC_KEY` | For offline | — | RSA public key (PEM) for offline `.lic` verification. Replace `\n` with actual newlines. |
| `PERSIST_CREDENTIAL_DIR` | No | `.tmp` | Directory for `.device-id` and `.license-key` persistence |

### Example `.env`

```env
LICENSE_SERVER_URL=https://billing.nexusquantum.id
LICENSE_API_KEY=your_api_key_here
LICENSE_GRACE_PERIOD_DAYS=7
PERSIST_CREDENTIAL_DIR=./.data
```

---

## 10. Security Checklist

- [ ] **Never expose `LICENSE_API_KEY` to the client.** All verification calls go through your backend.
- [ ] **Mask license keys in responses.** Display as `XXXX-****-****-XXXX` in UI and logs.
- [ ] **Set cookies as `HttpOnly` and `SameSite=Strict`.** Prevents XSS and CSRF.
- [ ] **Restrict activation endpoints to admin users.** Non-admins should not be able to change license keys.
- [ ] **Validate `.lic` file signatures.** Never trust file content without RSA signature verification.
- [ ] **Don't store the license key in localStorage.** Store it server-side only (disk + database).
- [ ] **Use HTTPS for all license server communication.**
- [ ] **Persist `PERSIST_CREDENTIAL_DIR` as a Docker volume** in containerized deployments so the device ID survives restarts.
- [ ] **Log license events** (activation, expiration, grace period) for audit purposes.

---

## 11. Complete Integration Examples

### Minimal Integration Checklist

1. **Add environment variables** (Section 9)
2. **Create license database table** (Section 3.3)
3. **Implement device ID generation** (Section 3.1)
4. **Implement license verification service** (Section 3.2)
5. **Add API endpoints:**
   - `POST /api/license/activate` — accepts `{ licenseKey }`, returns `LicenseState`
   - `POST /api/license/upload` — accepts `{ fileContent }`, returns `LicenseState`
   - `GET /api/license/status` — returns current `LicenseState`
6. **Add server middleware** to redirect unlicensed users (Section 8.1)
7. **Build EULA page** (Section 5)
8. **Build license activation page** (Section 4)
9. **Add client-side route guard** for periodic re-checks (Section 8.2)
10. **Wire up the flow:** EULA → License Activation → Main App

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        APP STARTUP                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Server:  Load persisted key → checkLicense() (non-fatal)   │
│                                                             │
│  Client:  Middleware checks cookie                          │
│           │                                                 │
│           ├── Cookie valid? ──────────► Main App            │
│           │                                                 │
│           └── No cookie? ──────────► /setup/license         │
│                                        │                    │
│                           ┌────────────┴──────────┐         │
│                           │                       │         │
│                      EULA accepted?          Show EULA      │
│                           │                       │         │
│                           ▼                  Accept → ──┐   │
│                    License Activation             ◄─────┘   │
│                           │                                 │
│              ┌────────────┴────────────┐                    │
│              │                         │                    │
│         Enter key              Upload .lic file             │
│              │                         │                    │
│              ▼                         ▼                    │
│     POST /api/license/        POST /api/license/            │
│           activate                  upload                  │
│              │                         │                    │
│              └────────────┬────────────┘                    │
│                           │                                 │
│                    isLicensed?                               │
│                    │           │                             │
│                   Yes         No                            │
│                    │           │                             │
│              Set cookie    Show error                        │
│              Redirect /    message                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Python (FastAPI) Backend Example

```python
# license_router.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/api/license")

class ActivateRequest(BaseModel):
    licenseKey: str

class UploadRequest(BaseModel):
    fileContent: str

@router.post("/activate")
async def activate(req: ActivateRequest):
    device_id = get_or_create_device_id(".data")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{settings.LICENSE_SERVER_URL}/api/v1/licenses/verify",
            headers={"Authorization": f"Bearer {settings.LICENSE_API_KEY}"},
            json={
                "licenseKey": req.licenseKey,
                "deviceId": device_id,
                "deviceName": "Your App Name",
            },
        )
        data = response.json()

    if data.get("valid") and data.get("license"):
        # Save to DB, persist key to disk
        return {
            "isLicensed": True,
            "status": "active",
            "customerName": data["license"]["customer"],
            "product": data["license"]["product"],
            "expiresAt": data["license"]["expiresAt"],
            "errorMessage": None,
        }

    return {
        "isLicensed": False,
        "status": data.get("error", "invalid"),
        "errorMessage": data.get("message", "Verification failed"),
    }

@router.get("/status")
async def status():
    state = license_service.get_license_state()
    return state
```

### Go Backend Example

```go
// handlers/license.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
)

type ActivateRequest struct {
    LicenseKey string `json:"licenseKey"`
}

type VerifyRequest struct {
    LicenseKey string `json:"licenseKey"`
    DeviceID   string `json:"deviceId"`
    DeviceName string `json:"deviceName"`
}

func ActivateLicense(w http.ResponseWriter, r *http.Request) {
    var req ActivateRequest
    json.NewDecoder(r.Body).Decode(&req)

    deviceID, _ := license.GetOrCreateDeviceID(".data")

    verifyBody, _ := json.Marshal(VerifyRequest{
        LicenseKey: req.LicenseKey,
        DeviceID:   deviceID,
        DeviceName: "Your App Name",
    })

    client := &http.Client{Timeout: 10 * time.Second}
    httpReq, _ := http.NewRequest("POST",
        config.LicenseServerURL+"/api/v1/licenses/verify",
        bytes.NewReader(verifyBody),
    )
    httpReq.Header.Set("Content-Type", "application/json")
    httpReq.Header.Set("Authorization", "Bearer "+config.LicenseAPIKey)

    resp, err := client.Do(httpReq)
    if err != nil {
        json.NewEncoder(w).Encode(map[string]any{
            "isLicensed":   false,
            "errorMessage": "Cannot reach license server",
        })
        return
    }
    defer resp.Body.Close()

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)

    // Process result and respond...
    json.NewEncoder(w).Encode(result)
}
```

---

## Quick Reference: API Endpoints Your App Needs

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/license/activate` | POST | Admin | Activate with license key |
| `/api/license/upload` | POST | Admin | Upload offline `.lic` file |
| `/api/license/status` | GET | Any | Get current license state |
| `/api/license/refresh` | POST | Admin | Force re-verification |

All endpoints return the same `LicenseState` shape for consistency.

---

**Questions?** Reach out to the NQRust platform team for `LICENSE_API_KEY` provisioning and offline license file generation.