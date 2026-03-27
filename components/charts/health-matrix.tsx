"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface HealthMatrixCell {
  x: string;
  y: string;
  status: "healthy" | "warning" | "critical" | "down" | "unknown";
  value?: number;
}

export interface HealthMatrixData {
  type: "health-matrix";
  title: string;
  xAxis: string[];
  yAxis: string[];
  cells: HealthMatrixCell[];
  updatedAt: string;
}

interface HealthMatrixProps {
  data: HealthMatrixData;
  className?: string;
}

export function HealthMatrix({ data, className }: HealthMatrixProps) {
  const rows = data.yAxis.map((clusterName) => {
    const row = { cluster: clusterName } as Record<string, string | number>;
    data.xAxis.forEach((metricName) => {
      const cell = data.cells.find((c) => c.x === metricName && c.y === clusterName);
      row[metricName] = Number.isFinite(cell?.value) ? Number(cell?.value) : 0;
    });
    return row;
  });

  const seriesColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

  return (
    <Card className={cn("p-4", className)}>
      <h3 className="text-sm font-medium mb-4">{data.title}</h3>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            barCategoryGap={20}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.45} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis
              dataKey="cluster"
              type="category"
              width={220}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              stroke="var(--border)"
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.2 }}
              contentStyle={{
                backgroundColor: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--popover-foreground)",
              }}
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
            {data.xAxis.map((metricName, idx) => (
              <Bar
                key={metricName}
                dataKey={metricName}
                fill={seriesColors[idx % seriesColors.length]}
                radius={[4, 4, 4, 4]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
