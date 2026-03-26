"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Search,
  RefreshCw,
  Clock,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface TimeRange {
  id: string;
  label: string;
  value: string;
}

const timeRanges: TimeRange[] = [
  { id: "5m", label: "Last 5 minutes", value: "5m" },
  { id: "15m", label: "Last 15 minutes", value: "15m" },
  { id: "1h", label: "Last 1 hour", value: "1h" },
  { id: "3h", label: "Last 3 hours", value: "3h" },
  { id: "6h", label: "Last 6 hours", value: "6h" },
  { id: "12h", label: "Last 12 hours", value: "12h" },
  { id: "24h", label: "Last 24 hours", value: "24h" },
  { id: "7d", label: "Last 7 days", value: "7d" },
];

interface CommandBarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: string;
  showTimeRange?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  connectorStatus?: "healthy" | "degraded" | "partial";
  className?: string;
  children?: React.ReactNode;
}

export function CommandBar({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  lastUpdated,
  showTimeRange = true,
  showSearch = true,
  showFilters = false,
  connectorStatus = "healthy",
  className,
  children,
}: CommandBarProps) {
  const [timeRange, setTimeRange] = useState("1h");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className={cn("border-b border-border bg-card px-6 py-3", className)}>
      <div className="flex items-center justify-between gap-4">
        {/* Left: Title and status */}
        <div className="flex items-center gap-4">
          {title && (
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}
          
          {/* Connector status indicator */}
          {connectorStatus !== "healthy" && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                connectorStatus === "degraded" && "bg-status-warning/10 text-status-warning",
                connectorStatus === "partial" && "bg-status-stale/10 text-status-stale"
              )}
            >
              <AlertCircle className="h-3 w-3" />
              {connectorStatus === "degraded" ? "Some connectors degraded" : "Partial data"}
            </div>
          )}
        </div>

        {/* Center: Search */}
        {showSearch && (
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search hosts, clusters, apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {children}
          
          {showFilters && (
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filters
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}

          {showTimeRange && (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] h-9">
                <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRanges.map((range) => (
                  <SelectItem key={range.id} value={range.id}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh
          </Button>

          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-status-healthy" />
              Updated {lastUpdated}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
