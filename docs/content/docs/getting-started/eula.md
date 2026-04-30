+++
title = "End User License Agreement"
description = "Summary of the InfraWatch EULA and what acceptance covers"
weight = 24
date = 2026-04-23

[extra]
toc = true
+++

On first login, every admin must read and accept the End User License Agreement (EULA) before the InfraWatch dashboard becomes accessible. The EULA screen appears automatically after the login form and cannot be skipped.

This page is a short summary intended as a reading aid. **The authoritative text is the agreement shown in the UI and the full version in the repository** — see [EULA.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) and the Bahasa Indonesia translation in [EULA Bahasa.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA%20Bahasa.md).

---

## When the EULA Is Shown

EULA acceptance is required on **first login**. The flow is:

```
/login  →  EULA modal  →  /setup/license  →  /  (dashboard)
```

Acceptance is stored with a version stamp. If Nexus Quantum Tech publishes a new version of the agreement, admins will be prompted to re-accept on their next login.

---

## Accepting the EULA

1. Read the full agreement text on screen.
2. Tick **"I have read and agree to the End User License Agreement"**.
3. Click **I Accept**.

You only need to accept once per EULA version. After acceptance, the modal will not appear again until the EULA version is bumped.

---

## Language

The EULA is available in two languages:

- **English** — `EULA.md` in the repository root, also shown by default in the UI.
- **Bahasa Indonesia** — `EULA Bahasa.md` in the repository root, available via the language selector (globe icon) in the top-right of the EULA screen.

Switch languages before reading and accepting. The underlying legal text is equivalent in both versions.

---

## EULA Summary

The full legal text is shown in the UI and committed to the repository. Key points:

| Article | Summary |
|---|---|
| **Article 1 — Intellectual Property** | All copyrights, patents, trade secrets, algorithms, source code, analytic engines, AI models, system designs, and documentation are the exclusive property of **Nexus Quantum Tech**. The agreement grants a right of use only — not ownership. |
| **Article 2 — License Grant** | You receive a **limited, non-exclusive, non-transferable, non-sublicensable** license scoped to the number of licenses purchased. This is not a sale. |
| **Article 3 — Installation & Activation Restrictions** | InfraWatch may be installed only up to the number of valid licenses. The software enforces this via license activation, machine fingerprinting, hardware binding, license keys, and online validation. |
| **Article 4 — Prohibition on Piracy & Modification** | Duplication, installer redistribution, resale, reverse engineering, decompilation, license-protection removal, and unauthorized derivative versions are all **prohibited**. |
| **Article 5 — Right to Audit** | Nexus Quantum Tech may audit software usage to verify license compliance. Users must cooperate with the audit process. |
| **Article 6 — Telemetry** | InfraWatch transmits limited technical data (license status, device identification, install count, software version, technical error data) for license validation. **Operational monitoring data is never transmitted** without explicit permission. |
| **Article 7 — User Obligations** | Use lawfully, maintain license confidentiality, do not misuse the software, comply with Nexus Quantum Tech's provisions. |
| **Termination** | The license terminates automatically upon breach of any term. Upon termination, all use must cease and all copies must be deleted. |

{{% alert icon="⚠️" context="warning" %}}
This page is a summary only. The authoritative EULA is the text shown in the UI and in [EULA.md](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md). If you do not agree to the terms, do not install or use InfraWatch.
{{% /alert %}}

---

## Related

- [License Activation](../license/) — activating your license key after accepting the EULA.
- [Quick Start](../quick-start/) — the end-to-end first-login walkthrough.
- Full agreement — [`EULA.md`](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA.md) / [`EULA Bahasa.md`](https://github.com/NexusQuantum/InfraWatch/blob/main/EULA%20Bahasa.md) in the repository root.
