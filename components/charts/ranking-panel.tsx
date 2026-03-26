"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Simple item format
interface RankingItem {
  id: string;
  name?: string;
  label?: string;
  value: number;
  status?: string;
  href?: string;
}

// Structured data format (from detail pages)
interface StructuredRankingData {
  type?: "ranking";
  title?: string;
  unit?: string;
  rows: RankingItem[];
  updatedAt?: string;
}

interface RankingPanelProps {
  // Accept either items array or structured data object
  items?: RankingItem[];
  data?: StructuredRankingData;
  title?: string;
  maxValue?: number;
  unit?: string;
  colorByStatus?: boolean;
  showProgress?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: "text-status-healthy",
  warning: "text-status-warning",
  critical: "text-status-critical",
  down: "text-status-down",
  unknown: "text-muted-foreground",
};

const PROGRESS_BG: Record<string, string> = {
  healthy: "bg-status-healthy",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  down: "bg-status-down",
  unknown: "bg-muted-foreground",
};

function formatValue(value: number, unit?: string): string {
  if (unit === "%" || unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "bytes") {
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)} TB`;
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB`;
    return `${value} B`;
  }
  return value.toFixed(1);
}

export function RankingPanel({
  items: itemsProp,
  data,
  title: titleProp,
  maxValue,
  unit: unitProp = "%",
  colorByStatus = true,
  showProgress = true,
  className,
}: RankingPanelProps) {
  // Normalize: use items prop, or extract from data object
  const items = itemsProp || data?.rows || [];
  const title = titleProp || data?.title;
  const unit = unitProp || data?.unit || "%";
  
  const max = maxValue ?? Math.max(...items.map((r) => r.value), 1);

  if (!items.length) {
    return (
      <Card className={cn("p-4", className)}>
        {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
        <div className="text-sm text-muted-foreground text-center py-4">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      {title && <h3 className="text-sm font-medium mb-4">{title}</h3>}
      <div className="space-y-3">
        {items.map((item, i) => {
          const itemName = item.name || item.label || item.id;
          const textColor = colorByStatus && item.status ? STATUS_COLORS[item.status] || "" : "";
          const progressColor = colorByStatus && item.status ? PROGRESS_BG[item.status] || "bg-chart-1" : "bg-chart-1";

          const content = (
            <div className="group">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className={cn("text-sm truncate", textColor)}>{itemName}</span>
                </div>
                <span className={cn("text-sm font-medium tabular-nums shrink-0", textColor)}>
                  {formatValue(item.value, unit)}
                </span>
              </div>

              {showProgress && (
                <div className="ml-6 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${Math.min((item.value / max) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );

          if (item.href) {
            return (
              <Link key={item.id} href={item.href} className="block hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors">
                {content}
              </Link>
            );
          }

          return <div key={item.id}>{content}</div>;
        })}
      </div>
    </Card>
  );
}
