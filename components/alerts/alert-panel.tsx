"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  AlertCircle,
  Check,
  Eye,
  Bell,
  BellOff,
  ShieldCheck,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAlerts,
  useAlertCount,
  acknowledgeAlert,
  resolveAlertAction,
  type Alert,
} from "@/lib/api/alert-hooks";

interface AlertPanelProps {
  onClose?: () => void;
}

export function AlertPanel({ onClose }: AlertPanelProps) {
  const { alerts, isLoading, refresh } = useAlerts("active");
  const { count } = useAlertCount();
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.severity === filter;
  });

  const handleAcknowledge = async (id: string) => {
    await acknowledgeAlert(id);
    refresh();
  };

  const handleResolve = async (id: string) => {
    await resolveAlertAction(id);
    refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-muted">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Alerts</h2>
              <p className="text-xs text-muted-foreground">
                {count.total > 0
                  ? `${count.total} active${count.critical > 0 ? ` · ${count.critical} critical` : ""}`
                  : "All systems normal"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          {([
            { key: "all", label: "All", count: count.total },
            { key: "critical", label: "Critical", count: count.critical },
            { key: "warning", label: "Warning", count: count.warning },
          ] as const).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  f.key === "critical" && f.count > 0
                    ? "bg-red-500/15 text-red-500"
                    : f.key === "warning" && f.count > 0
                      ? "bg-yellow-500/15 text-yellow-600"
                      : "bg-muted-foreground/15 text-muted-foreground"
                }`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin mb-2" />
            <span className="text-sm">Loading alerts...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="p-4 rounded-full bg-muted mb-4">
              {count.total === 0 ? (
                <ShieldCheck className="h-8 w-8 text-status-healthy" />
              ) : (
                <BellOff className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-sm font-medium mb-1">
              {count.total === 0 ? "All Clear" : `No ${filter} alerts`}
            </h3>
            <p className="text-xs text-muted-foreground text-center max-w-[240px]">
              {count.total === 0
                ? "No active alerts. All monitored systems are operating within normal thresholds."
                : `There are no ${filter}-level alerts right now. Try viewing all alerts.`}
            </p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-1.5">
            {filtered.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {count.total > 0 && (
        <div className="px-5 py-3 border-t border-border text-xs text-muted-foreground text-center">
          Alerts are evaluated every 30 seconds from live Prometheus data
        </div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const isCritical = alert.severity === "critical";

  return (
    <div className={`rounded-lg border p-3 transition-colors ${
      isCritical
        ? "border-red-500/20 bg-red-500/5"
        : "border-yellow-500/20 bg-yellow-500/5"
    }`}>
      {/* Top row: icon + entity + badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1 rounded ${isCritical ? "bg-red-500/10" : "bg-yellow-500/10"}`}>
            {isCritical ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
            )}
          </div>
          <span className="text-sm font-medium truncate">{alert.entityName}</span>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          isCritical
            ? "bg-red-500/15 text-red-600"
            : "bg-yellow-500/15 text-yellow-600"
        }`}>
          {alert.severity}
        </span>
      </div>

      {/* Message */}
      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{alert.message}</p>

      {/* Footer: time + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(alert.firedAt), { addSuffix: true })}
        </div>
        <div className="flex gap-1">
          {alert.status === "active" && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            >
              <Eye className="h-3 w-3" />
              Ack
            </button>
          )}
          <button
            onClick={() => onResolve(alert.id)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-status-healthy hover:bg-status-healthy/10 transition-colors"
          >
            <Check className="h-3 w-3" />
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
}
