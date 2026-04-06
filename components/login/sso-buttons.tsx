"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface SsoProvider {
  id: "saml" | "oidc";
  displayName: string;
}

export function SsoButtons() {
  const [providers, setProviders] = useState<SsoProvider[]>([]);

  useEffect(() => {
    fetch("/api/auth/sso/providers")
      .then((res) => res.json())
      .then((data) => setProviders(data.providers || []))
      .catch(() => {});
  }, []);

  if (providers.length === 0) return null;

  return (
    <div className="space-y-3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          variant="outline"
          className="w-full gap-2"
          onClick={() => {
            window.location.href = `/api/auth/sso/${provider.id}/login`;
          }}
        >
          <LogIn className="h-4 w-4" />
          {provider.displayName || `Sign in with ${provider.id.toUpperCase()}`}
        </Button>
      ))}

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            or sign in with password
          </span>
        </div>
      </div>
    </div>
  );
}
