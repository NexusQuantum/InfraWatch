"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PanelsTopLeft,
  Search,
  Plus,
  ArrowUpRight,
  Server,
  Layers,
  Database,
  Container,
  Box,
  LayoutDashboard,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { dashboards } from "@/lib/mocks/dashboards";

const categoryIcons: Record<string, React.ReactNode> = {
  overview: <LayoutDashboard className="h-5 w-5" />,
  hosts: <Server className="h-5 w-5" />,
  clusters: <Layers className="h-5 w-5" />,
  storage: <Database className="h-5 w-5" />,
  kubernetes: <Container className="h-5 w-5" />,
  apps: <Box className="h-5 w-5" />,
  custom: <PanelsTopLeft className="h-5 w-5" />,
};

export default function DashboardsPage() {
  const systemDashboards = dashboards.filter(d => d.owner === "system");
  const customDashboards = dashboards.filter(d => d.owner === "admin");

  return (
    <AppShell>
      <CommandBar
        title="Dashboards"
        subtitle={`${dashboards.length} dashboards available`}
      >
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Dashboard
        </Button>
      </CommandBar>

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search dashboards..." className="pl-9" />
        </div>

        {/* System dashboards */}
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">System Dashboards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemDashboards.map(dashboard => (
              <Link key={dashboard.id} href={`/dashboards/${dashboard.slug}`}>
                <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground">
                      {categoryIcons[dashboard.category] || categoryIcons.custom}
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
                    {dashboard.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Custom dashboards */}
        {customDashboards.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Custom Dashboards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customDashboards.map(dashboard => (
                <Link key={dashboard.id} href={`/dashboards/${dashboard.slug}`}>
                  <Card className="p-4 hover:bg-accent/5 transition-colors h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-md bg-muted text-muted-foreground">
                        {categoryIcons[dashboard.category] || categoryIcons.custom}
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="mb-2">
                      <h3 className="font-medium">{dashboard.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {dashboard.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {dashboard.category}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty state for custom */}
        {customDashboards.length === 0 && (
          <Card className="p-8 text-center">
            <PanelsTopLeft className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-sm font-medium mb-1">No Custom Dashboards</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Create a custom dashboard by cloning a system dashboard.
            </p>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Dashboard
            </Button>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
