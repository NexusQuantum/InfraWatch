"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PanelsTopLeft,
  Search,
  ArrowUpRight,
  AlertTriangle,
  Server,
  Layers,
  Database,
  Container,
  Box,
  LayoutDashboard,
  Settings,
  Plug,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { useLiveDashboards } from "@/lib/api/live-hooks";

const categoryIcons: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard className="h-5 w-5" />,
  hosts: <Server className="h-5 w-5" />,
  clusters: <Layers className="h-5 w-5" />,
  storage: <Database className="h-5 w-5" />,
  kubernetes: <Container className="h-5 w-5" />,
  apps: <Box className="h-5 w-5" />,
  connectors: <Plug className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  custom: <PanelsTopLeft className="h-5 w-5" />,
};

function hrefFromSlug(slug: string) {
  if (!slug) return "/";
  return `/${slug}`;
}

export default function DashboardsPage() {
  const { dashboards, meta, isLoading, isError, error } = useLiveDashboards();
  const [query, setQuery] = useState("");
  const diagnostics = isError || meta?.partial || (meta?.errors?.length ?? 0) > 0;

  const filtered = useMemo(() => {
    if (!query) return dashboards;
    const q = query.toLowerCase();
    return dashboards.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [dashboards, query]);

  return (
    <AppShell>
      <CommandBar title="Dashboards" subtitle={`${dashboards.length} live dashboards available`} />

      <div className="p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dashboards..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {isLoading && (
          <Card className="p-4 text-sm text-muted-foreground">Loading dashboards...</Card>
        )}
        {diagnostics && (
          <Card className="p-4 border-status-warning/40">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-status-warning" />
              <div className="space-y-1 text-sm">
                <div className="font-medium">Data Source Diagnostics</div>
                {error && <div className="text-muted-foreground">{error.message}</div>}
                {meta?.errors?.map((msg) => (
                  <div key={msg} className="text-muted-foreground">{msg}</div>
                ))}
                {meta?.failedConnectors?.length ? (
                  <div className="text-muted-foreground">
                    Failed connectors: {meta.failedConnectors.join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        )}

        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <PanelsTopLeft className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Dashboards Match</h3>
            <p className="text-sm text-muted-foreground">Try a different search term.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((dashboard) => (
              <Link key={dashboard.id} href={hrefFromSlug(dashboard.slug)}>
                <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground">
                      {categoryIcons[dashboard.slug] || categoryIcons[dashboard.category] || categoryIcons.custom}
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="mb-2">
                    <h3 className="font-medium">{dashboard.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {dashboard.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs capitalize">
                      {dashboard.category}
                    </Badge>
                    {dashboard.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
