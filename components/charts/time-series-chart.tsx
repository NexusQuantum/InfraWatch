"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

// Simple flat data point format (used by page.tsx overview)
interface SimpleDataPoint {
  timestamp: string;
  value: number;
  series: string;
}

// Structured data format (used by detail pages)
interface SeriesPoint {
  ts: string;
  value: number;
}

interface SeriesData {
  id: string;
  name: string;
  status?: "healthy" | "warning" | "critical";
  points: SeriesPoint[];
}

interface StructuredData {
  type?: "timeseries";
  title?: string;
  unit?: string;
  series: SeriesData[];
  updatedAt?: string;
  meta?: { stacked?: boolean };
}

// Props accept either format
interface TimeSeriesChartProps {
  title?: string;
  data: SimpleDataPoint[] | StructuredData;
  series?: string[];
  height?: number;
  showLegend?: boolean;
  variant?: "line" | "area";
  unit?: "percent" | "bytes" | "bytesPerSec" | "ms" | "count" | "rate";
  className?: string;
}

const COLORS = [
  "hsl(210, 100%, 60%)",
  "hsl(145, 70%, 50%)",
  "hsl(45, 90%, 55%)",
  "hsl(280, 70%, 60%)",
  "hsl(15, 90%, 55%)",
];

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "bytes":
      if (value >= 1e12) return `${(value / 1e12).toFixed(1)} TB`;
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB`;
      return `${value} B`;
    case "bytesPerSec":
      if (value >= 1e9) return `${(value / 1e9).toFixed(1)} GB/s`;
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)} MB/s`;
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)} KB/s`;
      return `${value} B/s`;
    case "ms":
      if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
      return `${value.toFixed(0)}ms`;
    case "rate":
      return `${value.toFixed(1)}/s`;
    default:
      return value.toFixed(1);
  }
}

function formatTime(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Type guard to check if data is structured format
function isStructuredData(data: SimpleDataPoint[] | StructuredData): data is StructuredData {
  return !Array.isArray(data) && "series" in data;
}

export function TimeSeriesChart({
  title,
  data,
  series: seriesProp,
  height = 200,
  showLegend = true,
  variant = "line",
  unit = "percent",
  className,
}: TimeSeriesChartProps) {
  // Normalize data to chart format
  const { chartData, seriesNames } = useMemo(() => {
    // Handle structured data format
    if (isStructuredData(data)) {
      if (!data.series || !data.series.length) {
        return { chartData: [], seriesNames: [] };
      }
      
      const names = data.series.map(s => s.name);
      const firstSeries = data.series[0];
      
      if (!firstSeries.points || !firstSeries.points.length) {
        return { chartData: [], seriesNames: names };
      }
      
      const timestamps = firstSeries.points.map(p => p.ts);
      const formatted = timestamps.map((ts, i) => {
        const point: Record<string, string | number> = { ts };
        data.series.forEach(s => {
          point[s.name] = s.points[i]?.value ?? 0;
        });
        return point;
      });
      
      return { chartData: formatted, seriesNames: names };
    }
    
    // Handle simple flat array format
    if (!data || !data.length) {
      return { chartData: [], seriesNames: seriesProp || [] };
    }
    
    const names = seriesProp || [...new Set(data.map(p => p.series))];
    const grouped = new Map<string, Record<string, number | string>>();
    
    data.forEach(point => {
      if (!grouped.has(point.timestamp)) {
        grouped.set(point.timestamp, { ts: point.timestamp });
      }
      const entry = grouped.get(point.timestamp)!;
      entry[point.series] = point.value;
    });
    
    const formatted = Array.from(grouped.values()).sort((a, b) => 
      new Date(a.ts as string).getTime() - new Date(b.ts as string).getTime()
    );
    
    return { chartData: formatted, seriesNames: names };
  }, [data, seriesProp]);

  // Get title from structured data if not provided
  const chartTitle = title || (isStructuredData(data) ? data.title : undefined);
  // Get unit from structured data if not provided
  const chartUnit = unit || (isStructuredData(data) ? (data.unit as typeof unit) : "percent");

  if (!chartData.length) {
    return (
      <Card className={cn("p-4", className)}>
        {chartTitle && <h3 className="text-sm font-medium mb-4">{chartTitle}</h3>}
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
          No data available
        </div>
      </Card>
    );
  }

  const ChartComponent = variant === "area" ? AreaChart : LineChart;

  return (
    <Card className={cn("p-4", className)}>
      {chartTitle && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium">{chartTitle}</h3>
        </div>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="ts"
            tickFormatter={formatTime}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <YAxis
            tickFormatter={(v) => formatValue(v, chartUnit)}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
            domain={chartUnit === "percent" ? [0, 100] : ["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            labelFormatter={formatTime}
            formatter={(value: number, name: string) => [formatValue(value, chartUnit), name]}
          />
          {showLegend && seriesNames.length > 1 && (
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
          )}
          {seriesNames.map((seriesName, i) => {
            const color = COLORS[i % COLORS.length];
            
            if (variant === "area") {
              return (
                <Area
                  key={seriesName}
                  type="monotone"
                  dataKey={seriesName}
                  name={seriesName}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                />
              );
            }
            
            return (
              <Line
                key={seriesName}
                type="monotone"
                dataKey={seriesName}
                name={seriesName}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            );
          })}
        </ChartComponent>
      </ResponsiveContainer>
    </Card>
  );
}
