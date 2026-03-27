"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AlertBell } from "@/components/alerts/alert-bell";
import { useSidebar } from "@/components/layout/app-shell";
import {
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Server,
  Layers,
  Database,
  Monitor,
  Container,
  Box,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
} from "lucide-react";
import {
  useLiveHosts,
  useLiveComputeClusters,
  useLiveStorageClusters,
  useLiveVms,
  useLiveConnectors,
} from "@/lib/api/live-hooks";

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: React.ReactNode;
  status?: string;
}

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
  connectorStatus = "healthy",
  className,
  children,
}: CommandBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { hosts } = useLiveHosts();
  const { clusters: computeClusters } = useLiveComputeClusters();
  const { clusters: storageClusters } = useLiveStorageClusters();
  const { vms } = useLiveVms();
  const { connectors } = useLiveConnectors();

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: SearchResult[] = [];

    for (const h of hosts) {
      if (
        h.hostname.toLowerCase().includes(q) ||
        h.ipAddress?.toLowerCase().includes(q) ||
        h.instance.toLowerCase().includes(q)
      ) {
        out.push({
          id: h.id,
          label: h.hostname,
          sub: `Node · ${h.ipAddress || h.instance} · ${h.status}`,
          href: `/nodes/${encodeURIComponent(h.id)}`,
          icon: <Server className="h-3.5 w-3.5" />,
          status: h.status,
        });
      }
    }

    for (const c of computeClusters) {
      if (c.name.toLowerCase().includes(q) || c.site.toLowerCase().includes(q)) {
        out.push({
          id: c.id,
          label: c.name,
          sub: `Cluster · ${c.nodeCount} nodes · ${c.status}`,
          href: `/clusters/${encodeURIComponent(c.id)}`,
          icon: <Layers className="h-3.5 w-3.5" />,
          status: c.status,
        });
      }
    }

    for (const s of storageClusters) {
      if (s.name.toLowerCase().includes(q)) {
        out.push({
          id: s.id,
          label: s.name,
          sub: `Storage · ${s.nodeCount} nodes · ${s.status}`,
          href: `/storage/${encodeURIComponent(s.id)}`,
          icon: <Database className="h-3.5 w-3.5" />,
          status: s.status,
        });
      }
    }

    for (const vm of vms) {
      if (
        vm.name.toLowerCase().includes(q) ||
        vm.namespace.toLowerCase().includes(q) ||
        vm.node?.toLowerCase().includes(q)
      ) {
        out.push({
          id: vm.id,
          label: vm.name,
          sub: `VM · ${vm.namespace} · ${vm.status}`,
          href: `/vm/${encodeURIComponent(vm.id)}`,
          icon: <Monitor className="h-3.5 w-3.5" />,
          status: vm.status === "running" ? "healthy" : vm.status === "failed" ? "critical" : undefined,
        });
      }
    }

    for (const c of connectors) {
      if (c.name.toLowerCase().includes(q) || c.baseUrl.toLowerCase().includes(q)) {
        out.push({
          id: c.id,
          label: c.name,
          sub: `Connector · ${c.connectorType} · ${c.status}`,
          href: `/connectors/${encodeURIComponent(c.id)}`,
          icon: <Plug className="h-3.5 w-3.5" />,
          status: c.status === "healthy" ? "healthy" : c.status === "down" ? "critical" : "warning",
        });
      }
    }

    return out.slice(0, 10);
  }, [query, hosts, computeClusters, storageClusters, vms, connectors]);

  const showDropdown = focused && query.length >= 2;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(href: string) {
    setQuery("");
    setFocused(false);
    router.push(href);
  }

  const statusDot: Record<string, string> = {
    healthy: "bg-status-healthy",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    down: "bg-status-critical",
  };

  const { collapsed, toggle: toggleSidebar } = useSidebar();

  return (
    <header className={cn("border-b border-border bg-card px-4 h-[57px] flex items-center", className)}>
      <div className="flex items-center justify-between gap-4 w-full">
        {/* Left: Sidebar toggle + Title */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          {title && (
            <div>
              <h1 className="text-lg font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}

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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder="Search nodes, VMs, clusters..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                navigate(results[0].href);
              }
              if (e.key === "Escape") {
                setFocused(false);
                inputRef.current?.blur();
              }
            }}
            className="pl-9 bg-background"
          />

          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden"
            >
              {results.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-accent/50 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(r.href);
                    }}
                  >
                    <span className="text-muted-foreground">{r.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.sub}</div>
                    </div>
                    {r.status && (
                      <span className={cn("h-2 w-2 rounded-full shrink-0", statusDot[r.status] || "bg-muted")} />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {children}

          <AlertBell />
          <ThemeToggle />

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
