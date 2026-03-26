"use client";

import { cn } from "@/lib/utils";
import type { MetricsPanel as MetricsPanelType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkline } from "./sparkline";
import { FreshnessIndicator } from "./freshness-indicator";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";

interface MetricsPanelProps {
  panel: MetricsPanelType;
  className?: string;
}

function formatValue(value: number, unit?: string): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  if (unit === "bytes") {
    if (value === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(value) / Math.log(k));
    return parseFloat((value / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
  if (unit === "ms") return `${value.toFixed(0)}ms`;
  if (unit === "count") return value.toLocaleString();
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(1);
}

function TrendIcon({ trend }: { trend?: "up" | "down" | "stable" }) {
  if (trend === "up") {
    return <TrendingUp className="h-3.5 w-3.5 text-status-healthy" />;
  }
  if (trend === "down") {
    return <TrendingDown className="h-3.5 w-3.5 text-status-critical" />;
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function MetricsPanel({ panel, className }: MetricsPanelProps) {
  const isStale = panel.freshness === "stale";
  const isEmpty = !panel.metrics || panel.metrics.length === 0;
  const hasError = panel.error !== undefined;

  return (
    <Card className={cn("relative", isStale && "opacity-75", className)}>
      {isStale && (
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 text-xs text-status-stale">
            <AlertTriangle className="h-3 w-3" />
            <span>Stale</span>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{panel.title}</CardTitle>
          {panel.lastUpdated && (
            <FreshnessIndicator
              timestamp={panel.lastUpdated}
              staleThresholdMs={5 * 60 * 1000}
              size="sm"
            />
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {hasError ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertTriangle className="h-8 w-8 text-status-critical mb-2" />
            <p className="text-sm text-muted-foreground">{panel.error}</p>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground">No metrics available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {panel.metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground truncate">
                      {metric.label}
                    </span>
                    <TrendIcon trend={metric.trend} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl font-semibold tabular-nums">
                      {formatValue(metric.value, metric.unit)}
                    </span>
                    {metric.change !== undefined && (
                      <span
                        className={cn(
                          "text-xs",
                          metric.change > 0
                            ? "text-status-healthy"
                            : metric.change < 0
                            ? "text-status-critical"
                            : "text-muted-foreground"
                        )}
                      >
                        {metric.change > 0 ? "+" : ""}
                        {metric.change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
                {metric.sparkline && metric.sparkline.length > 1 && (
                  <Sparkline
                    data={metric.sparkline}
                    width={80}
                    height={32}
                    color={
                      metric.trend === "up"
                        ? "healthy"
                        : metric.trend === "down"
                        ? "critical"
                        : "chart1"
                    }
                    showArea
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Grid of metric cards
export function MetricsGrid({
  metrics,
  columns = 4,
  className,
}: {
  metrics: Array<{
    label: string;
    value: number;
    unit?: string;
    trend?: "up" | "down" | "stable";
    change?: number;
  }>;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {metrics.map((metric, index) => (
        <Card key={index} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground">{metric.label}</span>
            <TrendIcon trend={metric.trend} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {formatValue(metric.value, metric.unit)}
            </span>
            {metric.change !== undefined && (
              <span
                className={cn(
                  "text-xs",
                  metric.change > 0
                    ? "text-status-healthy"
                    : metric.change < 0
                    ? "text-status-critical"
                    : "text-muted-foreground"
                )}
              >
                {metric.change > 0 ? "+" : ""}
                {metric.change.toFixed(1)}%
              </span>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// Single metric display
export function MetricValue({
  value,
  unit,
  label,
  trend,
  size = "default",
  className,
}: {
  value: number;
  unit?: string;
  label?: string;
  trend?: "up" | "down" | "stable";
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "text-lg",
    default: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <span className="text-sm text-muted-foreground mb-0.5">{label}</span>
      )}
      <div className="flex items-center gap-2">
        <span className={cn("font-semibold tabular-nums", sizeClasses[size])}>
          {formatValue(value, unit)}
        </span>
        {trend && <TrendIcon trend={trend} />}
      </div>
    </div>
  );
}
