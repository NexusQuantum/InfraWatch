+++
title = "Table of Contents"
description = "Navigate the entire InfraWatch documentation from a single flat index."
icon = "Toc"
weight = 110
layout = "single"
date = 2026-04-23

[extra]
toc = true
+++

{{% alert icon="📚" context="info" %}}
This page is the flat index of every InfraWatch documentation page. Use it when you know the topic you want but not the section it lives in. Each link points to a page in the sidebar on the left.
{{% /alert %}}

### **Introduction**

- [**What is InfraWatch?**](../introduction/) - Product overview, the problem it solves, and where it fits in your stack

---

### **Getting Started**

- [**Getting Started Overview**](../getting-started/) - Choose the right path: installer, quick start, or licensing
- [Installation](../getting-started/installation/) - Run the TUI installer and bring up the PostgreSQL + Next.js stack
- [Quick Start](../getting-started/quick-start/) - Log in, add your first connector, and watch metrics stream in
- [License & Activation](../getting-started/license/) - Activate a license key and understand trial vs paid tiers
- [EULA](../getting-started/eula/) - Read the end user license agreement (English & Bahasa Indonesia)

---

### **Connectors**

- [**Connectors Overview**](../connectors/) - How InfraWatch pulls metrics from NQRust Hypervisor sources
- [NQRust Hypervisor](../connectors/nqrust-hypervisor/) - Connect to an NQRust Hypervisor control plane and ingest VM telemetry
- [Manage Connectors](../connectors/manage-connectors/) - Create, test, enable, disable, and delete connectors safely

---

### **Fleet & Monitoring**

- [**Fleet Overview**](../fleet/) - How InfraWatch aggregates every host, cluster, VM, and app into a single fleet view
- [Fleet Landing](../fleet/overview/) - Summary cards, health badges, and quick navigation to fleet segments
- [Hosts](../fleet/hosts/) - Bare-metal and VM hosts with CPU, memory, disk, and network charts
- [Clusters](../fleet/clusters/) - Logical groupings of hosts and connectors
- [Virtual Machines](../fleet/virtual-machines/) - NQRust VMs with live CPU, memory, disk I/O, and power state
- [Storage](../fleet/storage/) - Volumes, pools, and capacity trends across connectors
- [Applications](../fleet/applications/) - Service-level rollups with dependency context

---

### **Alerts**

- [**Alerts Overview**](../alerts/) - The alert pipeline: rules, evaluation, notifications, and history
- [Create an Alert Rule](../alerts/create-alert-rule/) - Define a PromQL expression, thresholds, and notification targets
- [Manage Alerts](../alerts/manage-alerts/) - Acknowledge, silence, reroute, and tune existing rules

---

### **Settings & Admin**

- [Authentication](../settings/authentication/) - Local accounts, sessions, CSRF, and password policy
- [Single Sign-On (SSO)](../settings/sso/) - Configure SAML and OAuth providers with production hardening
- [Password Management](../settings/password/) - Reset flow, complexity rules, and rotation
- [Audit Log](../settings/audit-log/) - Who did what, when, from which IP

---

### **Architecture**

- [**Architecture Overview**](../architecture/) - The Next.js app, PostgreSQL store, SWR polling layer, and connector fan-out
- [Data Model](../architecture/data-model/) - Tables, relationships, and retention policy
- [Security Model](../architecture/security-model/) - Auth, CSRF, session storage, and network boundaries

---

### **API Reference**

- [**API Overview**](../api-reference/) - Route conventions, JSON shapes, error codes, and pagination
- [Authentication API](../api-reference/auth/) - Login, logout, session, and password endpoints
- [Connectors API](../api-reference/connectors/) - CRUD, test, toggle, and list connector endpoints
- [Alerts API](../api-reference/alerts/) - Rule CRUD, evaluation, and alert history endpoints
- [Live API](../api-reference/live/) - Low-latency metric endpoints used by SWR polling
- [Prometheus API](../api-reference/prometheus/) - Proxy endpoints used to forward PromQL queries to NQRust Hypervisor's embedded Prometheus
- [License API](../api-reference/license/) - Activation, status, and entitlement endpoints
- [Settings API](../api-reference/settings/) - Admin settings and audit endpoints

---

### **TUI Installer**

- [**Installer Overview**](../installer/) - Why a Ratatui + Crossterm TUI, what it produces, and how to run it
- [Install Modes](../installer/modes/) - Full, Minimal, and Development modes and when to use each
- [Install Sources](../installer/sources/) - Online repository vs airgap tarball
- [Non-Interactive Mode](../installer/non-interactive/) - CLI flags and config files for unattended installs
- [Uninstall](../installer/uninstall/) - Clean removal of services, data, and users
- [TUI Walkthrough](../installer/tui-walkthrough/) - Screen-by-screen tour of the interactive installer

---

### **Troubleshooting**

- [**Troubleshooting Overview**](../troubleshooting/) - Diagnostic mindset, log locations, and support escalation
- [Common Issues](../troubleshooting/common-issues/) - Fixes for connector errors, login failures, and missing metrics
- [Logs](../troubleshooting/logs/) - Where each service writes logs and how to tail them

---

{{% alert icon="ℹ️" context="info" %}}
Can't find what you're looking for? Open an issue at [github.com/NexusQuantum/InfraWatch](https://github.com/NexusQuantum/InfraWatch) or use the search box at the top of the sidebar.
{{% /alert %}}

---
