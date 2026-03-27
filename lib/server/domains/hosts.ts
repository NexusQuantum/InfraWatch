import "server-only";

import type { Host, HostVmSummary } from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  queryVector,
  queryNumber,
  num,
  statusFromUsage,
  labelValue,
  rangeWindow,
  firstSeriesPoints,
  calcSlots,
  clampPercent,
  getConnectorConfig,
  queryRangeWithConfig,
  NOISY_INTERFACE_REGEX,
  type ApiResponseMeta,
} from "./shared";
import { getOrFetch } from "@/lib/server/cache";

async function _fetchLiveHosts(): Promise<ApiResponseMeta<Host[]>> {
  const bundles = await enabledConnectorBundles();
  const hosts: Host[] = [];
  const failedConnectors: string[] = [];
  const now = new Date().toISOString();

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [cpu, mem, disk, networkRx, networkTx, networkErrors, cpuCount, ifaceCount, nodeMeta, load1, load5, load15, uptime, diskIoUtil, diskReadIops, diskWriteIops] =
          await Promise.all([
            queryVector(
              config,
              "100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{mode='idle'}[5m])))"
            ),
            queryVector(
              config,
              "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))"
            ),
            queryVector(
              config,
              "100 * (1 - avg by(instance) (node_filesystem_avail_bytes{fstype!~'tmpfs|overlay|squashfs'} / node_filesystem_size_bytes{fstype!~'tmpfs|overlay|squashfs'}))"
            ),
            queryVector(
              config,
              `sum by(instance) (rate(node_network_receive_bytes_total{device!~'${NOISY_INTERFACE_REGEX}'}[5m]))`
            ),
            queryVector(
              config,
              `sum by(instance) (rate(node_network_transmit_bytes_total{device!~'${NOISY_INTERFACE_REGEX}'}[5m]))`
            ),
            queryVector(
              config,
              `sum by(instance) (rate(node_network_receive_errs_total{device!~'${NOISY_INTERFACE_REGEX}'}[5m]) + rate(node_network_transmit_errs_total{device!~'${NOISY_INTERFACE_REGEX}'}[5m]))`
            ),
            queryVector(config, "count by(instance) (node_cpu_seconds_total{mode='idle'})"),
            queryVector(
              config,
              `count by(instance) (node_network_receive_bytes_total{device!~'${NOISY_INTERFACE_REGEX}'})`
            ),
            queryVector(config, "node_uname_info"),
            queryVector(config, "node_load1"),
            queryVector(config, "node_load5"),
            queryVector(config, "node_load15"),
            queryVector(config, "node_time_seconds - node_boot_time_seconds"),
            queryVector(config, "100 * max by(instance) (rate(node_disk_io_time_seconds_total[5m]))"),
            queryVector(config, "sum by(instance) (rate(node_disk_reads_completed_total[5m]))"),
            queryVector(config, "sum by(instance) (rate(node_disk_writes_completed_total[5m]))"),
          ]);

        const map = new Map<
          string,
          {
            hostname?: string;
            ip?: string;
            cpu?: number;
            mem?: number;
            disk?: number;
            networkRx?: number;
            networkTx?: number;
            networkErrorRate?: number;
            cpuLogicalCount?: number;
            networkInterfaceCount?: number;
            load1?: number;
            load5?: number;
            load15?: number;
            uptimeSeconds?: number;
            diskIoUtilPct?: number;
            diskReadIops?: number;
            diskWriteIops?: number;
          }
        >();
        const ensure = (instance: string) => {
          if (!map.has(instance)) map.set(instance, {});
          return map.get(instance)!;
        };

        for (const v of nodeMeta) {
          const instance =
            v.metric.instance || v.metric.nodename || v.metric.node || "unknown";
          const entry = ensure(instance);
          entry.hostname =
            v.metric.nodename || v.metric.node || instance.split(":")[0];
          entry.ip = instance.split(":")[0];
        }
        for (const v of cpu)
          ensure(v.metric.instance || "unknown").cpu = num(v.value[1]);
        for (const v of mem)
          ensure(v.metric.instance || "unknown").mem = num(v.value[1]);
        for (const v of disk)
          ensure(v.metric.instance || "unknown").disk = num(v.value[1]);
        for (const v of networkRx)
          ensure(v.metric.instance || "unknown").networkRx = Math.max(
            0,
            num(v.value[1])
          );
        for (const v of networkTx)
          ensure(v.metric.instance || "unknown").networkTx = Math.max(
            0,
            num(v.value[1])
          );
        for (const v of networkErrors)
          ensure(v.metric.instance || "unknown").networkErrorRate = Math.max(
            0,
            num(v.value[1])
          );
        for (const v of cpuCount)
          ensure(v.metric.instance || "unknown").cpuLogicalCount = Math.max(
            0,
            Math.round(num(v.value[1]))
          );
        for (const v of ifaceCount)
          ensure(v.metric.instance || "unknown").networkInterfaceCount = Math.max(
            0,
            Math.round(num(v.value[1]))
          );
        for (const v of load1) ensure(v.metric.instance || "unknown").load1 = num(v.value[1]);
        for (const v of load5) ensure(v.metric.instance || "unknown").load5 = num(v.value[1]);
        for (const v of load15) ensure(v.metric.instance || "unknown").load15 = num(v.value[1]);
        for (const v of uptime) ensure(v.metric.instance || "unknown").uptimeSeconds = Math.max(0, num(v.value[1]));
        for (const v of diskIoUtil) ensure(v.metric.instance || "unknown").diskIoUtilPct = Math.max(0, Math.min(100, num(v.value[1])));
        for (const v of diskReadIops) ensure(v.metric.instance || "unknown").diskReadIops = Math.max(0, num(v.value[1]));
        for (const v of diskWriteIops) ensure(v.metric.instance || "unknown").diskWriteIops = Math.max(0, num(v.value[1]));

        for (const [instance, value] of map.entries()) {
          const cpuUsagePct = value.cpu ?? 0;
          const memoryUsagePct = value.mem ?? 0;
          const diskUsagePct = value.disk ?? 0;
          const status = statusFromUsage(cpuUsagePct, memoryUsagePct, diskUsagePct);
          hosts.push({
            id: `${connector.id}:${instance}`,
            hostname: value.hostname || instance,
            instance,
            connectorId: connector.id,
            site: connector.site,
            datacenter: connector.datacenter,
            environment: connector.environment,
            role: "mixed",
            status,
            ipAddress: value.ip,
            labels: {},
            freshness: { lastScrapeAt: now, stale: false },
            current: {
              cpuUsagePct,
              memoryUsagePct,
              diskUsagePct,
              networkRxBytesPerSec: value.networkRx ?? 0,
              networkTxBytesPerSec: value.networkTx ?? 0,
              networkErrorRate: value.networkErrorRate ?? 0,
              cpuLogicalCount: value.cpuLogicalCount ?? undefined,
              networkInterfaceCount: value.networkInterfaceCount ?? undefined,
              load1: value.load1,
              load5: value.load5,
              load15: value.load15,
              uptimeSeconds: value.uptimeSeconds,
              diskIoUtilPct: value.diskIoUtilPct,
              diskReadIops: value.diskReadIops,
              diskWriteIops: value.diskWriteIops,
            },
          });
        }
      } catch {
        failedConnectors.push(connector.id);
      }
    })
  );

  return {
    data: hosts.sort((a, b) => a.hostname.localeCompare(b.hostname)),
    meta: {
      timestamp: new Date().toISOString(),
      partial: failedConnectors.length > 0,
      stale: false,
      errors: failedConnectors.length
        ? [`Failed connectors: ${failedConnectors.join(", ")}`]
        : undefined,
      failedConnectors: failedConnectors.length ? failedConnectors : undefined,
    },
  };
}

export function fetchLiveHosts(): Promise<ApiResponseMeta<Host[]>> {
  return getOrFetch("live:hosts", 20_000, _fetchLiveHosts);
}

export async function fetchLiveHostTimeseries(
  hostId: string,
  range = "1h",
  step = "5m"
) {
  const separator = hostId.indexOf(":");
  if (separator < 1) throw new Error("Invalid host id");
  const connectorId = hostId.slice(0, separator);
  const instance = hostId.slice(separator + 1);
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");

  const window = rangeWindow(range, step);
  const instanceLabel = labelValue(instance);

  const [cpu, memory, disk, rx, tx] = await Promise.all([
    queryRangeWithConfig(
      config,
      `100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{mode='idle',instance="${instanceLabel}"}[5m])))`,
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      `100 * (1 - (node_memory_MemAvailable_bytes{instance="${instanceLabel}"} / node_memory_MemTotal_bytes{instance="${instanceLabel}"}) )`,
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      `100 * (1 - avg by(instance) (node_filesystem_avail_bytes{instance="${instanceLabel}",fstype!~'tmpfs|overlay|squashfs'} / node_filesystem_size_bytes{instance="${instanceLabel}",fstype!~'tmpfs|overlay|squashfs'}))`,
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      `sum by(instance) (rate(node_network_receive_bytes_total{instance="${instanceLabel}",device!~'${NOISY_INTERFACE_REGEX}'}[5m]))`,
      window.start,
      window.end,
      window.step
    ),
    queryRangeWithConfig(
      config,
      `sum by(instance) (rate(node_network_transmit_bytes_total{instance="${instanceLabel}",device!~'${NOISY_INTERFACE_REGEX}'}[5m]))`,
      window.start,
      window.end,
      window.step
    ),
  ]);

  return {
    data: {
      cpu: firstSeriesPoints(cpu),
      memory: firstSeriesPoints(memory),
      disk: firstSeriesPoints(disk),
      networkRx: firstSeriesPoints(rx),
      networkTx: firstSeriesPoints(tx),
      range,
      step: window.step,
      updatedAt: window.now,
      source: "prometheus" as const,
    },
    meta: {
      timestamp: window.now,
      partial: false,
      stale: false,
    },
  };
}

export async function fetchLiveHostNetworkInterfaces(
  hostId: string,
  raw = false
) {
  const separator = hostId.indexOf(":");
  if (separator < 1) throw new Error("Invalid host id");
  const connectorId = hostId.slice(0, separator);
  const instance = hostId.slice(separator + 1);
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");

  const instanceLabel = labelValue(instance);
  const filter = raw ? "" : `,device!~'${NOISY_INTERFACE_REGEX}'`;
  const [rx, tx, err] = await Promise.all([
    queryVector(
      config,
      `sum by(device) (rate(node_network_receive_bytes_total{instance="${instanceLabel}"${filter}}[5m]))`
    ),
    queryVector(
      config,
      `sum by(device) (rate(node_network_transmit_bytes_total{instance="${instanceLabel}"${filter}}[5m]))`
    ),
    queryVector(
      config,
      `sum by(device) (rate(node_network_receive_errs_total{instance="${instanceLabel}"${filter}}[5m]) + rate(node_network_transmit_errs_total{instance="${instanceLabel}"${filter}}[5m]))`
    ),
  ]);

  const byDevice = new Map<string, { rx: number; tx: number; err: number }>();
  const ensure = (device: string) => {
    if (!byDevice.has(device)) byDevice.set(device, { rx: 0, tx: 0, err: 0 });
    return byDevice.get(device)!;
  };

  for (const row of rx) {
    const device = row.metric.device || "unknown";
    ensure(device).rx = Math.max(0, num(row.value[1]));
  }
  for (const row of tx) {
    const device = row.metric.device || "unknown";
    ensure(device).tx = Math.max(0, num(row.value[1]));
  }
  for (const row of err) {
    const device = row.metric.device || "unknown";
    ensure(device).err = Math.max(0, num(row.value[1]));
  }

  const rows = Array.from(byDevice.entries()).map(([device, values]) => ({
    interface: device,
    rxBytesPerSec: values.rx,
    txBytesPerSec: values.tx,
    errorRate: values.err,
    throughputBytesPerSec: values.rx + values.tx,
  }));

  return {
    data: rows.slice().sort((a, b) => b.throughputBytesPerSec - a.throughputBytesPerSec),
    meta: {
      timestamp: new Date().toISOString(),
      partial: false,
      stale: false,
    },
  };
}

export async function fetchLiveHostVm(
  hostId: string
): Promise<ApiResponseMeta<HostVmSummary>> {
  const separator = hostId.indexOf(":");
  if (separator < 1) throw new Error("Invalid host id");
  const connectorId = hostId.slice(0, separator);
  const instance = hostId.slice(separator + 1);
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");

  const instanceLabel = labelValue(instance);
  const defaultData: HostVmSummary = {
    runningVms: 0,
    freeCpuCores: 0,
    freeMemoryBytes: 0,
    slots: { small: 0, medium: 0, large: 0 },
    vmCpuRequestedCores: 0,
    vmMemoryRequestedBytes: 0,
    vmCpuRequestedPct: 0,
    vmMemoryRequestedPct: 0,
    inventory: [],
    partialData: false,
    errors: [],
  };

  const errors: string[] = [];
  try {
    const nodeMeta = await queryVector(
      config,
      `node_uname_info{instance="${instanceLabel}"}`
    );
    const nodeLabel =
      nodeMeta[0]?.metric.nodename ||
      nodeMeta[0]?.metric.node ||
      nodeMeta[0]?.metric.instance?.split(":")[0] ||
      instance.split(":")[0];
    const escapedNode = labelValue(nodeLabel);

    const [runningRaw, allocCpuRaw, allocMemRaw, vmReqCpuRaw, vmReqMemRaw, inventoryRaw] =
      await Promise.all([
        queryNumber(
          config,
          `count(kubevirt_vmi_info{phase="running",node="${escapedNode}"})`
        ),
        queryNumber(
          config,
          `sum(kube_node_status_allocatable{resource="cpu",node="${escapedNode}"})`
        ),
        queryNumber(
          config,
          `sum(kube_node_status_allocatable{resource="memory",node="${escapedNode}"})`
        ),
        queryNumber(
          config,
          `sum(kube_pod_container_resource_requests{pod=~"virt-launcher-.*",resource="cpu",node="${escapedNode}"})`
        ),
        queryNumber(
          config,
          `sum(kube_pod_container_resource_requests{pod=~"virt-launcher-.*",resource="memory",node="${escapedNode}"})`
        ),
        queryVector(config, `kubevirt_vmi_info{node="${escapedNode}"}`),
      ]);

    const runningVms = Math.max(0, Math.round(runningRaw));
    const allocatableCpu = Math.max(0, allocCpuRaw);
    const allocatableMemory = Math.max(0, allocMemRaw);
    const vmCpuRequestedCores = Math.max(0, vmReqCpuRaw);
    const vmMemoryRequestedBytes = Math.max(0, vmReqMemRaw);
    const freeCpuCores = Math.max(0, allocatableCpu - vmCpuRequestedCores);
    const freeMemoryBytes = Math.max(0, allocatableMemory - vmMemoryRequestedBytes);
    const slots = calcSlots(freeCpuCores, freeMemoryBytes);
    const vmCpuRequestedPct =
      allocatableCpu > 0
        ? clampPercent((vmCpuRequestedCores / allocatableCpu) * 100)
        : 0;
    const vmMemoryRequestedPct =
      allocatableMemory > 0
        ? clampPercent((vmMemoryRequestedBytes / allocatableMemory) * 100)
        : 0;

    const inventory = inventoryRaw.map((row) => ({
      name: row.metric.name || row.metric.vmi || row.metric.domain || row.metric.pod,
      namespace: row.metric.namespace,
      phase: row.metric.phase,
      node: row.metric.node,
    }));

    return {
      data: {
        runningVms,
        freeCpuCores,
        freeMemoryBytes,
        slots,
        vmCpuRequestedCores,
        vmMemoryRequestedBytes,
        vmCpuRequestedPct,
        vmMemoryRequestedPct,
        inventory,
        partialData: false,
        errors: [],
      },
      meta: {
        timestamp: new Date().toISOString(),
        partial: false,
        stale: false,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch node VM data";
    errors.push(message);
    return {
      data: {
        ...defaultData,
        partialData: true,
        errors,
      },
      meta: {
        timestamp: new Date().toISOString(),
        partial: true,
        stale: false,
        errors,
        failedConnectors: [connectorId],
      },
    };
  }
}
