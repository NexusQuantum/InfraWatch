import "server-only";

import type {
  FleetVmHostSummary,
  VmDetail,
  VmListItem,
  VmStatus,
} from "@/lib/types/entities";
import {
  enabledConnectorBundles,
  queryVector,
  queryNumber,
  num,
  toNodeValueMap,
  calcSlots,
  labelValue,
  regexValue,
  rangeWindow,
  firstSeriesPoints,
  getConnectorConfig,
  queryRangeWithConfig,
  type ApiResponseMeta,
  type PrometheusConnectorConfig,
} from "./shared";
import { getOrFetch } from "@/lib/server/cache";

function vmStatusFromPhase(phaseRaw?: string): VmStatus {
  const phase = (phaseRaw || "").toLowerCase();
  if (phase === "running") return "running";
  if (phase === "pending" || phase === "scheduling") return "pending";
  if (phase === "failed") return "failed";
  if (phase === "succeeded" || phase === "stopped") return "stopped";
  return "unknown";
}

function parseVmNameFromLauncherPod(podName?: string): string | null {
  if (!podName || !podName.startsWith("virt-launcher-")) return null;
  const base = podName.slice("virt-launcher-".length);
  const vmName = base.replace(/-[a-z0-9]{4,10}$/i, "");
  return vmName || null;
}

function parseVmId(vmId: string): {
  connectorId: string;
  namespace: string;
  name: string;
} {
  const first = vmId.indexOf(":");
  const second = vmId.indexOf(":", first + 1);
  if (first < 1 || second < first + 2 || second >= vmId.length - 1) {
    throw new Error("Invalid VM id");
  }
  return {
    connectorId: vmId.slice(0, first),
    namespace: vmId.slice(first + 1, second),
    name: vmId.slice(second + 1),
  };
}

export interface VmConnectorSummary {
  runningVms: number;
  hostsWithVms: number;
  totalEstimatedSlots: {
    small: number;
    medium: number;
    large: number;
  };
  topVmHosts: Array<{
    hostId: string;
    hostName: string;
    runningVms: number;
    slotsMedium: number;
  }>;
}

async function _fetchLiveVmByConnector() {
  const bundles = await enabledConnectorBundles();
  const hostMap = new Map<string, FleetVmHostSummary>();
  const byConnector = new Map<string, VmConnectorSummary>();
  const failedConnectors: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [runningByNodeRaw, allocCpuRaw, allocMemRaw, vmReqCpuRaw, vmReqMemRaw] =
          await Promise.all([
            queryVector(
              config,
              "count by(node) (kubevirt_vmi_info{phase='running'})"
            ),
            queryVector(
              config,
              "sum by(node) (kube_node_status_allocatable{resource='cpu',unit='core'})"
            ),
            queryVector(
              config,
              "sum by(node) (kube_node_status_allocatable{resource='memory',unit='byte'})"
            ),
            queryVector(
              config,
              "sum by(node) (kube_pod_container_resource_requests{resource='cpu',unit='core',pod=~'virt-launcher-.*'})"
            ),
            queryVector(
              config,
              "sum by(node) (kube_pod_container_resource_requests{resource='memory',unit='byte',pod=~'virt-launcher-.*'})"
            ),
          ]);

        const runningByNode = toNodeValueMap(runningByNodeRaw);
        const allocCpuByNode = toNodeValueMap(allocCpuRaw);
        const allocMemByNode = toNodeValueMap(allocMemRaw);
        const vmReqCpuByNode = toNodeValueMap(vmReqCpuRaw);
        const vmReqMemByNode = toNodeValueMap(vmReqMemRaw);

        const nodes = new Set<string>([
          ...runningByNode.keys(),
          ...allocCpuByNode.keys(),
          ...allocMemByNode.keys(),
          ...vmReqCpuByNode.keys(),
          ...vmReqMemByNode.keys(),
        ]);

        const connectorHostRows: FleetVmHostSummary[] = [];
        for (const node of nodes) {
          const runningVms = Math.max(
            0,
            Math.round(runningByNode.get(node) ?? 0)
          );
          const allocCpu = Math.max(0, allocCpuByNode.get(node) ?? 0);
          const allocMem = Math.max(0, allocMemByNode.get(node) ?? 0);
          const vmReqCpu = Math.max(0, vmReqCpuByNode.get(node) ?? 0);
          const vmReqMem = Math.max(0, vmReqMemByNode.get(node) ?? 0);
          const freeCpuCores = Math.max(0, allocCpu - vmReqCpu);
          const freeMemoryBytes = Math.max(0, allocMem - vmReqMem);
          const slots = calcSlots(freeCpuCores, freeMemoryBytes);

          const row: FleetVmHostSummary = {
            hostId: `${connector.id}:${node}`,
            hostName: node,
            connectorId: connector.id,
            runningVms,
            freeCpuCores,
            freeMemoryBytes,
            slotsSmall: slots.small,
            slotsMedium: slots.medium,
            slotsLarge: slots.large,
          };
          hostMap.set(`${connector.id}:${node}`, row);
          connectorHostRows.push(row);
        }

        byConnector.set(connector.id, {
          runningVms: connectorHostRows.reduce(
            (acc, row) => acc + row.runningVms,
            0
          ),
          hostsWithVms: connectorHostRows.filter((row) => row.runningVms > 0)
            .length,
          totalEstimatedSlots: connectorHostRows.reduce(
            (acc, row) => ({
              small: acc.small + row.slotsSmall,
              medium: acc.medium + row.slotsMedium,
              large: acc.large + row.slotsLarge,
            }),
            { small: 0, medium: 0, large: 0 }
          ),
          topVmHosts: connectorHostRows
            .slice()
            .sort(
              (a, b) =>
                b.runningVms - a.runningVms || b.slotsMedium - a.slotsMedium
            )
            .slice(0, 5)
            .map((row) => ({
              hostId: row.hostId,
              hostName: row.hostName,
              runningVms: row.runningVms,
              slotsMedium: row.slotsMedium,
            })),
        });
      } catch (error) {
        failedConnectors.push(connector.id);
        errors.push(
          `VM metrics query failed for ${connector.name}: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    })
  );

  return {
    rows: Array.from(hostMap.values()),
    byConnector,
    failedConnectors,
    errors,
  };
}

export function fetchLiveVmByConnector() {
  return getOrFetch("live:vm-by-connector", 20_000, _fetchLiveVmByConnector);
}

export async function fetchLiveVmOverview() {
  const vmData = await fetchLiveVmByConnector();
  const rows = vmData.rows;
  const totalEstimatedSlots = rows.reduce(
    (acc, row) => ({
      small: acc.small + row.slotsSmall,
      medium: acc.medium + row.slotsMedium,
      large: acc.large + row.slotsLarge,
    }),
    { small: 0, medium: 0, large: 0 }
  );

  return {
    data: {
      totalRunning: rows.reduce((acc, row) => acc + row.runningVms, 0),
      hostsWithVms: rows.filter((row) => row.runningVms > 0).length,
      hostsWithCapacity: rows.filter(
        (row) =>
          row.slotsMedium > 0 || row.slotsSmall > 0 || row.slotsLarge > 0
      ).length,
      totalEstimatedSlots,
      topVmDenseHosts: rows
        .slice()
        .sort(
          (a, b) =>
            b.runningVms - a.runningVms || b.slotsMedium - a.slotsMedium
        )
        .slice(0, 5),
      topCapacityHosts: rows
        .slice()
        .sort(
          (a, b) =>
            b.slotsMedium - a.slotsMedium || b.freeCpuCores - a.freeCpuCores
        )
        .slice(0, 5),
      partialData: vmData.failedConnectors.length > 0,
      errors: vmData.errors,
    },
    meta: {
      partial: vmData.failedConnectors.length > 0,
      errors: vmData.errors.length ? vmData.errors : undefined,
      failedConnectors: vmData.failedConnectors.length
        ? vmData.failedConnectors
        : undefined,
    },
  };
}

export async function fetchLiveVms(): Promise<ApiResponseMeta<VmListItem[]>> {
  const bundles = await enabledConnectorBundles();
  const failedConnectors: string[] = [];
  const errors: string[] = [];
  const vmMap = new Map<string, VmListItem>();

  await Promise.all(
    bundles.map(async ({ connector, config }) => {
      try {
        const [vmiRows, vmCpuRequests, vmMemoryRequests] = await Promise.all([
          queryVector(config, "kubevirt_vmi_info"),
          queryVector(
            config,
            "sum by(namespace,pod) (kube_pod_container_resource_requests{pod=~'virt-launcher-.*',resource='cpu'})"
          ),
          queryVector(
            config,
            "sum by(namespace,pod) (kube_pod_container_resource_requests{pod=~'virt-launcher-.*',resource='memory'})"
          ),
        ]);

        const requestMap = new Map<string, { cpu?: number; memory?: number }>();
        const ensure = (key: string) => {
          if (!requestMap.has(key)) requestMap.set(key, {});
          return requestMap.get(key)!;
        };

        for (const row of vmCpuRequests) {
          const namespace = row.metric.namespace || "default";
          const vmName = parseVmNameFromLauncherPod(row.metric.pod);
          if (!vmName) continue;
          const key = `${namespace}:${vmName}`;
          ensure(key).cpu = Math.max(0, num(row.value[1]));
        }
        for (const row of vmMemoryRequests) {
          const namespace = row.metric.namespace || "default";
          const vmName = parseVmNameFromLauncherPod(row.metric.pod);
          if (!vmName) continue;
          const key = `${namespace}:${vmName}`;
          ensure(key).memory = Math.max(0, num(row.value[1]));
        }

        for (const row of vmiRows) {
          const name =
            row.metric.name ||
            row.metric.vmi ||
            row.metric.domain ||
            row.metric.pod;
          if (!name) continue;
          const namespace = row.metric.namespace || "default";
          const phase = row.metric.phase || "unknown";
          const status = vmStatusFromPhase(phase);
          const id = `${connector.id}:${namespace}:${name}`;
          const req = requestMap.get(`${namespace}:${name}`);
          vmMap.set(id, {
            id,
            connectorId: connector.id,
            name,
            namespace,
            node: row.metric.node || row.metric.nodename || undefined,
            phase,
            status,
            cpuRequestedCores: req?.cpu,
            memoryRequestedBytes: req?.memory,
          });
        }
      } catch (error) {
        failedConnectors.push(connector.id);
        errors.push(
          `VM list query failed for ${connector.name}: ${error instanceof Error ? error.message : "unknown error"}`
        );
      }
    })
  );

  const data = Array.from(vmMap.values()).sort(
    (a, b) =>
      a.namespace.localeCompare(b.namespace) ||
      a.name.localeCompare(b.name) ||
      a.connectorId.localeCompare(b.connectorId)
  );

  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      partial: failedConnectors.length > 0,
      stale: false,
      errors: errors.length ? errors : undefined,
      failedConnectors: failedConnectors.length ? failedConnectors : undefined,
    },
  };
}

export async function fetchLiveVm(
  vmId: string
): Promise<ApiResponseMeta<VmDetail>> {
  const { connectorId, namespace, name } = parseVmId(vmId);
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");

  const nsLabel = labelValue(namespace);
  const nameLabel = labelValue(name);
  const nameRegex = regexValue(name);
  const podRegex = `virt-launcher-${nameRegex}-[a-z0-9]{4,10}`;
  const errors: string[] = [];

  const base: VmDetail = {
    id: vmId,
    connectorId,
    name,
    namespace,
    phase: "unknown",
    status: "unknown",
  };

  try {
    let vmiRows = await queryVector(
      config,
      `kubevirt_vmi_info{namespace="${nsLabel}",name="${nameLabel}"}`
    );
    if (!vmiRows.length) {
      vmiRows = await queryVector(
        config,
        `kubevirt_vmi_info{namespace="${nsLabel}",vmi="${nameLabel}"}`
      );
    }
    if (!vmiRows.length) {
      return {
        data: base,
        meta: {
          timestamp: new Date().toISOString(),
          partial: true,
          stale: false,
          errors: ["VM not found in live Prometheus data"],
          failedConnectors: [connectorId],
        },
      };
    }

    const row = vmiRows[0];
    const node = row.metric.node || row.metric.nodename || undefined;
    const phase = row.metric.phase || "unknown";
    const status = vmStatusFromPhase(phase);

    const [
      cpuRequestedCores,
      memoryRequestedBytes,
      cpuUsageCores,
      memoryUsedBytes,
      memoryAvailableBytes,
      memoryDomainBytes,
      networkRxBytesPerSec,
      networkTxBytesPerSec,
      storageReadIops,
      storageWriteIops,
      storageReadBytesPerSec,
      storageWriteBytesPerSec,
      vcpuDelaySec,
      dirtyRateBytesPerSec,
      diskAllocRows,
      resourceLimitRows,
    ] = await Promise.all([
      queryNumber(
        config,
        `sum(kube_pod_container_resource_requests{namespace="${nsLabel}",pod=~"${podRegex}",resource="cpu"})`
      ),
      queryNumber(
        config,
        `sum(kube_pod_container_resource_requests{namespace="${nsLabel}",pod=~"${podRegex}",resource="memory"})`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `kubevirt_vmi_memory_used_bytes{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
      queryNumber(
        config,
        `kubevirt_vmi_memory_available_bytes{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
      queryNumber(
        config,
        `kubevirt_vmi_memory_domain_bytes{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_network_receive_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_network_transmit_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_storage_iops_read_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_storage_iops_write_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_storage_read_traffic_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_storage_write_traffic_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `sum(rate(kubevirt_vmi_vcpu_delay_seconds_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`
      ),
      queryNumber(
        config,
        `kubevirt_vmi_dirty_rate_bytes_per_second{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
      queryVector(
        config,
        `kubevirt_vm_disk_allocated_size_bytes{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
      queryVector(
        config,
        `kubevirt_vm_resource_limits{namespace="${nsLabel}",name="${nameLabel}"}`
      ),
    ]);

    let nodeAllocatableCpuCores: number | undefined;
    let nodeAllocatableMemoryBytes: number | undefined;
    let nodeFreeCpuCores: number | undefined;
    let nodeFreeMemoryBytes: number | undefined;
    let nodeFreeSlots:
      | { small: number; medium: number; large: number }
      | undefined;

    if (node) {
      const nodeLabel = labelValue(node);
      const [allocCpu, allocMem, nodeVmReqCpu, nodeVmReqMem] =
        await Promise.all([
          queryNumber(
            config,
            `sum(kube_node_status_allocatable{resource="cpu",node="${nodeLabel}"})`
          ),
          queryNumber(
            config,
            `sum(kube_node_status_allocatable{resource="memory",node="${nodeLabel}"})`
          ),
          queryNumber(
            config,
            `sum(kube_pod_container_resource_requests{pod=~"virt-launcher-.*",resource="cpu",node="${nodeLabel}"})`
          ),
          queryNumber(
            config,
            `sum(kube_pod_container_resource_requests{pod=~"virt-launcher-.*",resource="memory",node="${nodeLabel}"})`
          ),
        ]);
      nodeAllocatableCpuCores = Math.max(0, allocCpu);
      nodeAllocatableMemoryBytes = Math.max(0, allocMem);
      nodeFreeCpuCores = Math.max(
        0,
        nodeAllocatableCpuCores - Math.max(0, nodeVmReqCpu)
      );
      nodeFreeMemoryBytes = Math.max(
        0,
        nodeAllocatableMemoryBytes - Math.max(0, nodeVmReqMem)
      );
      nodeFreeSlots = calcSlots(nodeFreeCpuCores, nodeFreeMemoryBytes);
    }

    // Parse disk allocations
    const disks = diskAllocRows
      .filter((r) => r.metric.device)
      .map((r) => ({
        device: r.metric.device,
        allocatedBytes: Math.max(0, num(r.value[1])),
      }));

    // Parse resource limits
    let resourceLimits: VmDetail["resourceLimits"];
    if (resourceLimitRows.length > 0) {
      const cpuLimit = resourceLimitRows.find(
        (r) => r.metric.resource === "cpu" && r.metric.unit === "cores"
      );
      const memLimit = resourceLimitRows.find(
        (r) => r.metric.resource === "memory"
      );
      resourceLimits = {
        cpuCores: cpuLimit ? num(cpuLimit.value[1]) : undefined,
        memoryBytes: memLimit ? num(memLimit.value[1]) : undefined,
      };
    }

    const data: VmDetail = {
      id: vmId,
      connectorId,
      name,
      namespace,
      node,
      phase,
      status,
      cpuRequestedCores: Number.isFinite(cpuRequestedCores)
        ? Math.max(0, cpuRequestedCores)
        : undefined,
      memoryRequestedBytes: Number.isFinite(memoryRequestedBytes)
        ? Math.max(0, memoryRequestedBytes)
        : undefined,
      nodeAllocatableCpuCores,
      nodeAllocatableMemoryBytes,
      nodeFreeCpuCores,
      nodeFreeMemoryBytes,
      nodeFreeSlots,
      cpuUsageCores: cpuUsageCores || undefined,
      memoryUsedBytes: memoryUsedBytes || undefined,
      memoryAvailableBytes: memoryAvailableBytes || undefined,
      memoryDomainBytes: memoryDomainBytes || undefined,
      networkRxBytesPerSec: networkRxBytesPerSec || undefined,
      networkTxBytesPerSec: networkTxBytesPerSec || undefined,
      storageReadIops: storageReadIops || undefined,
      storageWriteIops: storageWriteIops || undefined,
      storageReadBytesPerSec: storageReadBytesPerSec || undefined,
      storageWriteBytesPerSec: storageWriteBytesPerSec || undefined,
      vcpuDelaySec: vcpuDelaySec || undefined,
      dirtyRateBytesPerSec: dirtyRateBytesPerSec || undefined,
      disks: disks.length > 0 ? disks : undefined,
      resourceLimits,
    };

    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        partial: false,
        stale: false,
      },
    };
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Failed to query VM detail"
    );
    return {
      data: base,
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

export async function fetchLiveVmTimeseries(
  vmId: string,
  range = "1h",
  step = "5m"
) {
  const { connectorId, namespace, name } = parseVmId(vmId);
  const config = await getConnectorConfig(connectorId);
  if (!config) throw new Error("Connector not found or disabled");

  const window = rangeWindow(range, step);
  const nsLabel = labelValue(namespace);
  const nameLabel = labelValue(name);

  const [cpu, memUsed, netRx, netTx, diskReadIops, diskWriteIops] =
    await Promise.all([
      queryRangeWithConfig(
        config,
        `sum(rate(kubevirt_vmi_cpu_usage_seconds_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`,
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        `kubevirt_vmi_memory_used_bytes{namespace="${nsLabel}",name="${nameLabel}"}`,
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        `sum(rate(kubevirt_vmi_network_receive_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`,
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        `sum(rate(kubevirt_vmi_network_transmit_bytes_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`,
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        `sum(rate(kubevirt_vmi_storage_iops_read_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`,
        window.start,
        window.end,
        window.step
      ),
      queryRangeWithConfig(
        config,
        `sum(rate(kubevirt_vmi_storage_iops_write_total{namespace="${nsLabel}",name="${nameLabel}"}[5m]))`,
        window.start,
        window.end,
        window.step
      ),
    ]);

  return {
    data: {
      cpu: firstSeriesPoints(cpu),
      memoryUsed: firstSeriesPoints(memUsed),
      networkRx: firstSeriesPoints(netRx),
      networkTx: firstSeriesPoints(netTx),
      diskReadIops: firstSeriesPoints(diskReadIops),
      diskWriteIops: firstSeriesPoints(diskWriteIops),
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
