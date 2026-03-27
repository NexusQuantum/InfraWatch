"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAlerts } from "@/lib/api/alert-hooks";

export function AlertToastWatcher() {
  const { alerts } = useAlerts("active");
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    if (!alerts.length) return;

    for (const alert of alerts) {
      if (seenIds.current.has(alert.id)) continue;
      seenIds.current.add(alert.id);

      if (alert.severity === "critical") {
        toast.error(alert.message, {
          description: alert.entityName,
          duration: 8000,
        });
      } else {
        toast.warning(alert.message, {
          description: alert.entityName,
          duration: 6000,
        });
      }
    }

    // Clean up resolved alerts from seen set
    const activeIds = new Set(alerts.map((a) => a.id));
    for (const id of seenIds.current) {
      if (!activeIds.has(id)) {
        seenIds.current.delete(id);
      }
    }
  }, [alerts]);

  return null;
}
