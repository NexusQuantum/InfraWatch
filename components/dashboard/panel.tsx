"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FreshnessIndicator } from "./freshness-indicator";
import { EmptyState } from "./empty-state";
import { 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  MoreHorizontal,
  ChevronRight 
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ReactNode } from "react";
import type { PanelFreshness } from "@/lib/types";

interface PanelProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  // State
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  stale?: boolean;
  freshness?: PanelFreshness;
  lastUpdated?: string;
  // Actions
  onRefresh?: () => void;
  onViewAll?: () => void;
  viewAllHref?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  }>;
  // Layout
  noPadding?: boolean;
  compact?: boolean;
}

export function Panel({
  title,
  description,
  children,
  className,
  loading = false,
  error,
  empty = false,
  emptyMessage = "No data available",
  emptyIcon,
  stale = false,
  freshness,
  lastUpdated,
  onRefresh,
  onViewAll,
  viewAllHref,
  actions,
  noPadding = false,
  compact = false,
}: PanelProps) {
  const isStale = stale || freshness === "stale";
  const hasError = !!error;
  const isEmpty = empty && !loading && !hasError;

  return (
    <Card
      className={cn(
        "relative",
        isStale && "border-status-stale/50",
        hasError && "border-status-critical/50",
        className
      )}
    >
      {/* Stale indicator overlay */}
      {isStale && !hasError && (
        <div className="absolute inset-0 bg-status-stale/5 rounded-lg pointer-events-none z-10" />
      )}

      <CardHeader className={cn(compact ? "pb-2" : "pb-4")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className={cn("truncate", compact && "text-sm")}>
                {title}
              </CardTitle>
              {isStale && (
                <div className="flex items-center gap-1 text-xs text-status-stale">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Stale</span>
                </div>
              )}
            </div>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {lastUpdated && (
              <FreshnessIndicator
                timestamp={lastUpdated}
                staleThresholdMs={5 * 60 * 1000}
                size="sm"
              />
            )}

            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                />
                <span className="sr-only">Refresh</span>
              </Button>
            )}

            {(onViewAll || viewAllHref) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onViewAll}
                asChild={!!viewAllHref}
              >
                {viewAllHref ? (
                  <a href={viewAllHref}>
                    View all
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </a>
                ) : (
                  <>
                    View all
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            )}

            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, index) => (
                    <DropdownMenuItem key={index} onClick={action.onClick}>
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(noPadding && "p-0")}>
        {loading ? (
          <PanelSkeleton compact={compact} />
        ) : hasError ? (
          <PanelError error={error} onRetry={onRefresh} />
        ) : isEmpty ? (
          <EmptyState
            title={emptyMessage}
            icon={emptyIcon}
            size="sm"
          />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Error state component
function PanelError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-status-critical/10 mb-3">
        <AlertTriangle className="h-6 w-6 text-status-critical" />
      </div>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

// Loading skeleton
function PanelSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("space-y-3 animate-pulse", compact ? "py-2" : "py-4")}>
      <div className="h-4 w-3/4 bg-muted rounded" />
      <div className="h-4 w-1/2 bg-muted rounded" />
      <div className="h-4 w-2/3 bg-muted rounded" />
    </div>
  );
}

// Section header for grouping panels
export function PanelSection({
  title,
  description,
  children,
  actions,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// Grid layout for panels
export function PanelGrid({
  children,
  columns = 2,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", colClasses[columns], className)}>
      {children}
    </div>
  );
}
