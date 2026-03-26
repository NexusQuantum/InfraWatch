"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";
import type { TimeSeriesPoint } from "@/lib/types";

interface SparklineProps {
  data: TimeSeriesPoint[] | number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  color?: "default" | "healthy" | "warning" | "critical" | "chart1" | "chart2";
  showArea?: boolean;
  showDots?: boolean;
  className?: string;
}

const colorMap: Record<string, string> = {
  default: "stroke-foreground",
  healthy: "stroke-status-healthy",
  warning: "stroke-status-warning",
  critical: "stroke-status-critical",
  chart1: "stroke-chart-1",
  chart2: "stroke-chart-2",
};

const fillColorMap: Record<string, string> = {
  default: "fill-foreground/10",
  healthy: "fill-status-healthy/10",
  warning: "fill-status-warning/10",
  critical: "fill-status-critical/10",
  chart1: "fill-chart-1/10",
  chart2: "fill-chart-2/10",
};

export function Sparkline({
  data,
  width = 100,
  height = 24,
  strokeWidth = 1.5,
  color = "default",
  showArea = false,
  showDots = false,
  className,
}: SparklineProps) {
  const normalizedData = useMemo(() => {
    if (data.length === 0) return [];
    return data.map((point) =>
      typeof point === "number" ? point : point.value
    );
  }, [data]);

  const pathData = useMemo(() => {
    if (normalizedData.length < 2) return { line: "", area: "" };

    const min = Math.min(...normalizedData);
    const max = Math.max(...normalizedData);
    const range = max - min || 1;

    const padding = 2;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = normalizedData.map((value, index) => {
      const x = padding + (index / (normalizedData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y };
    });

    const line = points
      .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const area = `${line} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

    return { line, area, points };
  }, [normalizedData, width, height]);

  if (normalizedData.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center text-xs text-muted-foreground", className)}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
    >
      {showArea && pathData.area && (
        <path
          d={pathData.area}
          className={cn(fillColorMap[color], "transition-all")}
          strokeWidth={0}
        />
      )}
      <path
        d={pathData.line}
        fill="none"
        className={cn(colorMap[color], "transition-all")}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots && pathData.points && (
        <>
          {pathData.points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={2}
              className={cn(colorMap[color].replace("stroke-", "fill-"))}
            />
          ))}
        </>
      )}
    </svg>
  );
}

// Mini sparkline for inline use
export function MiniSparkline({
  data,
  trend,
  className,
}: {
  data: number[];
  trend?: "up" | "down" | "stable";
  className?: string;
}) {
  const color = trend === "up" ? "healthy" : trend === "down" ? "critical" : "default";

  return (
    <Sparkline
      data={data}
      width={48}
      height={16}
      strokeWidth={1}
      color={color}
      className={className}
    />
  );
}
