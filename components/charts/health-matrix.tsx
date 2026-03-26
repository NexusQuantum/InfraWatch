"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

const STATUS_COLORS = {
  healthy: "bg-status-healthy",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  down: "bg-status-down",
  unknown: "bg-muted",
};

export function HealthMatrix({ data, className }: HealthMatrixProps) {
  const getCellData = (x: string, y: string) => {
    return data.cells.find(cell => cell.x === x && cell.y === y);
  };

  return (
    <Card className={cn("p-4", className)}>
      <h3 className="text-sm font-medium mb-4">{data.title}</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-1 text-left text-muted-foreground font-medium"></th>
              {data.xAxis.map(x => (
                <th key={x} className="p-1 text-center text-muted-foreground font-medium">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.yAxis.map(y => (
              <tr key={y}>
                <td className="p-1 text-muted-foreground font-medium truncate max-w-[100px]">
                  {y}
                </td>
                {data.xAxis.map(x => {
                  const cell = getCellData(x, y);
                  const status = cell?.status || "unknown";
                  
                  return (
                    <td key={`${x}-${y}`} className="p-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-8 h-8 rounded-sm mx-auto cursor-default flex items-center justify-center transition-opacity hover:opacity-80",
                                STATUS_COLORS[status]
                              )}
                            >
                              {cell?.value !== undefined && (
                                <span className="text-[10px] font-medium text-white/90">
                                  {cell.value.toFixed(0)}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-xs">
                              <div className="font-medium">{y} - {x}</div>
                              <div className="text-muted-foreground">
                                Status: {status}
                                {cell?.value !== undefined && ` (${cell.value.toFixed(1)}%)`}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
