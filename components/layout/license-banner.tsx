"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useLicenseStatus } from "@/lib/api/license-hooks";

export function LicenseBanner() {
  const { isGracePeriod, graceDaysRemaining } = useLicenseStatus();

  if (!isGracePeriod) return null;

  return (
    <div className="bg-status-warning/10 border-b border-status-warning/30 px-4 py-2 text-center text-sm text-status-warning">
      <AlertTriangle className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
      License verification pending. Grace period:{" "}
      <strong>{graceDaysRemaining}</strong> day{graceDaysRemaining !== 1 ? "s" : ""} remaining.{" "}
      <Link href="/setup/license" className="underline font-medium hover:text-foreground">
        Verify now
      </Link>
    </div>
  );
}
