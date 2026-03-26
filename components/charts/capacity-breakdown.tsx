"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface CapacitySegment {
  label: string;
  value: number;
  status?: "healthy" | "warning" | "critical";
}

export interface CapacityBreakdownData {
  type: "capacity-breakdown";
  title: string;
  segments: CapacitySegment[];
  unit: "bytes" | "percent" | "count";
  updatedAt: string;
}

interface CapacityBreakdownProps {
  data: CapacityBreakdownData;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e15) return `${(bytes / 1e15).toFixed(1)} PB`;
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${bytes} B`;
}

export function CapacityBreakdown({ data, className }: CapacityBreakdownProps) {
  const total = data.segments.reduce((acc, s) => acc + s.value, 0);
  
  const formatValue = (value: number) => {
    if (data.unit === "bytes") return formatBytes(value);
    if (data.unit === "percent") return `${value.toFixed(1)}%`;
    return value.toLocaleString();
  };

  return (
    <Card className={cn("p-4", className)}>
      <h3 className="text-sm font-medium mb-4">{data.title}</h3>
      
      {/* Stacked bar */}
      <div className="h-6 rounded-md overflow-hidden flex mb-4">
        {data.segments.map((segment, i) => {
          const percentage = (segment.value / total) * 100;
          return (
            <div
              key={i}
              className={cn(
                "h-full transition-all",
                segment.status === "critical" && "bg-status-critical",
                segment.status === "warning" && "bg-status-warning",
                segment.status === "healthy" && "bg-status-healthy",
                !segment.status && i === 0 && "bg-chart-1",
                !segment.status && i === 1 && "bg-chart-2",
                !segment.status && i >= 2 && "bg-chart-3"
              )}
              style={{ width: `${percentage}%` }}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.segments.map((segment, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-sm",
                  segment.status === "critical" && "bg-status-critical",
                  segment.status === "warning" && "bg-status-warning",
                  segment.status === "healthy" && "bg-status-healthy",
                  !segment.status && i === 0 && "bg-chart-1",
                  !segment.status && i === 1 && "bg-chart-2",
                  !segment.status && i >= 2 && "bg-chart-3"
                )}
              />
              <span className="text-muted-foreground">{segment.label}</span>
            </div>
            <span className="font-medium tabular-nums">{formatValue(segment.value)}</span>
          </div>
        ))}
      </div>
      
      {/* Total */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Total</span>
        <span className="font-medium tabular-nums">{formatValue(total)}</span>
      </div>
    </Card>
  );
}

// Simple capacity bar for quick display
interface CapacityBarProps {
  used: number;
  total: number;
  label?: string;
  showValues?: boolean;
  className?: string;
}

export function CapacityBar({ used, total, label, showValues = true, className }: CapacityBarProps) {
  const percentage = total > 0 ? (used / total) * 100 : 0;
  const status = percentage >= 90 ? "critical" : percentage >= 75 ? "warning" : "healthy";
  
  return (
    <div className={cn("space-y-1", className)}>
      {(label || showValues) && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showValues && (
            <span className="tabular-nums">
              {formatBytes(used)} / {formatBytes(total)}
            </span>
          )}
        </div>
      )}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            status === "critical" && "bg-status-critical",
            status === "warning" && "bg-status-warning",
            status === "healthy" && "bg-status-healthy"
          )}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
