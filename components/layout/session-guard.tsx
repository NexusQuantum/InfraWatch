"use client";

import { useEffect } from "react";

export function SessionGuard() {
  useEffect(() => {
    let active = true;

    async function check() {
      try {
        const res = await fetch("/api/auth/me");
        if (!active) return;
        if (res.status === 401) {
          window.location.href = "/login";
        }
      } catch {
        // network error — skip, will retry next interval
      }
    }

    // Check on mount
    check();

    // Check every 5 minutes
    const interval = setInterval(check, 5 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return null;
}
