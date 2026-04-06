"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  User,
  Bell,
  Clock,
  Palette,
  Shield,
  LogOut,
  RefreshCw,
  Save,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { CommandBar } from "@/components/layout/command-bar";
import { SsoSettings } from "@/components/settings/sso-settings";

export default function SettingsPage() {
  return (
    <AppShell>
      <CommandBar title="Settings" subtitle="Manage your preferences" />

      <div className="w-full p-6 space-y-6">
        {/* Profile */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Profile</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input defaultValue="admin" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" defaultValue="admin@infrawatch.local" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div>
                <Badge>Administrator</Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Display */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Display</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Theme</div>
                <div className="text-xs text-muted-foreground">Choose your preferred color scheme</div>
              </div>
              <Select defaultValue="dark">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Timezone</div>
                <div className="text-xs text-muted-foreground">Display times in your local timezone</div>
              </div>
              <Select defaultValue="utc">
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="local">Local (Browser)</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Compact Mode</div>
                <div className="text-xs text-muted-foreground">Use denser UI layout</div>
              </div>
              <Switch />
            </div>
          </div>
        </Card>

        {/* Refresh */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Data Refresh</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Auto-refresh</div>
                <div className="text-xs text-muted-foreground">Automatically refresh dashboard data</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Refresh Interval</div>
                <div className="text-xs text-muted-foreground">How often to fetch new data</div>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 seconds</SelectItem>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Critical Alerts</div>
                <div className="text-xs text-muted-foreground">Show alerts for critical issues</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Warning Alerts</div>
                <div className="text-xs text-muted-foreground">Show alerts for warnings</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Connector Status Changes</div>
                <div className="text-xs text-muted-foreground">Notify when connector status changes</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* Connector Scanning */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Connector Scanning</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Auto-discover capabilities</div>
                <div className="text-xs text-muted-foreground">Automatically detect connector capabilities</div>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">Scan Interval</div>
                <div className="text-xs text-muted-foreground">How often to check connector health</div>
              </div>
              <Select defaultValue="60">
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                  <SelectItem value="900">15 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* SSO */}
        <SsoSettings />

        {/* Session */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-medium">Session</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Sign Out</div>
              <div className="text-xs text-muted-foreground">End your current session</div>
            </div>
            <Button variant="outline" className="gap-1.5 text-destructive">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Save */}
        <div className="flex justify-end">
          <Button className="gap-1.5">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
