"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Server,
  Layers,
  Database,
  Container,
  Box,
  Settings,
  Plug,
  PanelsTopLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  capabilityRequired?: "storage" | "kubernetes" | "apps";
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Dashboards", href: "/dashboards", icon: <PanelsTopLeft className="h-4 w-4" /> },
  { label: "Hosts", href: "/hosts", icon: <Server className="h-4 w-4" /> },
  { label: "Clusters", href: "/clusters", icon: <Layers className="h-4 w-4" /> },
  { label: "Storage", href: "/storage", icon: <Database className="h-4 w-4" />, capabilityRequired: "storage" },
  { label: "Kubernetes", href: "/kubernetes", icon: <Container className="h-4 w-4" />, capabilityRequired: "kubernetes" },
  { label: "Apps", href: "/apps", icon: <Box className="h-4 w-4" />, capabilityRequired: "apps" },
  { label: "Connectors", href: "/connectors", icon: <Plug className="h-4 w-4" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

interface AppShellProps {
  children: React.ReactNode;
  capabilities?: {
    storage: boolean;
    kubernetes: boolean;
    apps: boolean;
  };
}

export function AppShell({ children, capabilities = { storage: true, kubernetes: true, apps: true } }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredNavItems = navItems.filter(item => {
    if (!item.capabilityRequired) return true;
    return capabilities[item.capabilityRequired];
  });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">InfraWatch</span>
          )}
          {collapsed && (
            <span className="font-semibold text-sidebar-foreground mx-auto">IW</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70"
                )}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-status-critical px-1.5 text-xs font-medium text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="absolute bottom-4 left-0 right-0 px-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 transition-all duration-200",
          collapsed ? "ml-16" : "ml-56"
        )}
      >
        {children}
      </main>
    </div>
  );
}
