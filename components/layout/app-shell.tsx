"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  Monitor,
  Layers,
  Database,
  Container,
  Box,
  Settings,
  Plug,
  LogOut,
} from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertToastWatcher } from "@/components/alerts/alert-toast-watcher";
import { SessionGuard } from "@/components/layout/session-guard";
import { LicenseBanner } from "@/components/layout/license-banner";

// ---------------------------------------------------------------------------
// Sidebar context — shared with CommandBar
// ---------------------------------------------------------------------------

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
});

export function useSidebar() {
  return useContext(SidebarContext);
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  capabilityRequired?: "storage" | "kubernetes" | "apps";
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: "Clusters", href: "/clusters", icon: <Layers className="h-4 w-4" /> },
  { label: "Nodes", href: "/nodes", icon: <Server className="h-4 w-4" /> },
  { label: "VM", href: "/vm", icon: <Monitor className="h-4 w-4" /> },
  { label: "Storage", href: "/storage", icon: <Database className="h-4 w-4" />, capabilityRequired: "storage" },
  { label: "Kubernetes", href: "/kubernetes", icon: <Container className="h-4 w-4" />, capabilityRequired: "kubernetes" },
  { label: "Apps", href: "/apps", icon: <Box className="h-4 w-4" />, capabilityRequired: "apps" },
  { label: "Connectors", href: "/connectors", icon: <Plug className="h-4 w-4" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

// ---------------------------------------------------------------------------
// AppShell
// ---------------------------------------------------------------------------

interface AppShellProps {
  children: React.ReactNode;
  capabilities?: {
    storage: boolean;
    kubernetes: boolean;
    apps: boolean;
  };
}

const TEMP_NAV_CAPABILITIES = { storage: true, kubernetes: false, apps: false };

export function AppShell({ children, capabilities = TEMP_NAV_CAPABILITIES }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : "";
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "x-csrf-token": csrf },
    });
    router.push("/login");
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.capabilityRequired) return true;
    return capabilities[item.capabilityRequired];
  });

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((v) => !v) }}>
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-200",
            collapsed ? "w-16" : "w-56"
          )}
        >
          {/* Logo area — same height as CommandBar header */}
          <div className="flex h-[57px] items-center justify-center border-b border-sidebar-border px-3">
            {!collapsed ? (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Image
                  src="/logo/nq-logo.png"
                  alt="NQRust-InfraWatch logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-sm"
                  priority
                />
                <span className="truncate font-semibold text-sidebar-foreground">
                  NQRust-InfraWatch
                </span>
              </div>
            ) : (
              <Image
                src="/logo/nq-logo.png"
                alt="NQRust-InfraWatch logo"
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded-sm"
                priority
              />
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

          {/* Bottom: sign out */}
          <div className="absolute bottom-4 left-0 right-0 px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className={cn(
                "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed ? "justify-center" : "justify-start gap-3 px-3"
              )}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Sign out</span>}
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
          <LicenseBanner />
          {children}
        </main>
        <AlertToastWatcher />
        <SessionGuard />
      </div>
    </SidebarContext.Provider>
  );
}
