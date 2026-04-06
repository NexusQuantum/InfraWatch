"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Shield, Save, Loader2, CheckCircle, AlertCircle, Copy } from "lucide-react";

function getCsrfToken(): string {
  const match = document.cookie.match(/csrf_token=([^;]*)/);
  return match?.[1] ?? "";
}

interface SsoFormState {
  enabled: boolean;
  displayName: string;
  // SAML
  samlIdpSsoUrl: string;
  samlIdpIssuer: string;
  samlIdpCert: string;
  samlSpEntityId: string;
  // OIDC
  oidcIssuerUrl: string;
  oidcClientId: string;
  oidcClientSecret: string;
  oidcScopes: string;
}

const EMPTY_FORM: SsoFormState = {
  enabled: false,
  displayName: "",
  samlIdpSsoUrl: "",
  samlIdpIssuer: "",
  samlIdpCert: "",
  samlSpEntityId: "",
  oidcIssuerUrl: "",
  oidcClientId: "",
  oidcClientSecret: "",
  oidcScopes: "openid email profile",
};

export function SsoSettings() {
  const [saml, setSaml] = useState<SsoFormState>({ ...EMPTY_FORM });
  const [oidc, setOidc] = useState<SsoFormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState<"saml" | "oidc" | null>(null);
  const [success, setSuccess] = useState<"saml" | "oidc" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/sso");
      if (!res.ok) return;
      const { configs } = await res.json();
      for (const c of configs) {
        const form: SsoFormState = {
          enabled: c.enabled,
          displayName: c.displayName || "",
          samlIdpSsoUrl: c.samlIdpSsoUrl || "",
          samlIdpIssuer: c.samlIdpIssuer || "",
          samlIdpCert: c.samlIdpCert || "",
          samlSpEntityId: c.samlSpEntityId || "",
          oidcIssuerUrl: c.oidcIssuerUrl || "",
          oidcClientId: c.oidcClientId || "",
          oidcClientSecret: c.oidcClientSecret || "",
          oidcScopes: c.oidcScopes || "openid email profile",
        };
        if (c.id === "saml") setSaml(form);
        if (c.id === "oidc") setOidc(form);
      }
    } catch {
      // ignore load errors
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleSave(provider: "saml" | "oidc") {
    setSaving(provider);
    setError(null);
    setSuccess(null);

    const form = provider === "saml" ? saml : oidc;

    try {
      const res = await fetch("/api/settings/sso", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({
          id: provider,
          enabled: form.enabled,
          displayName: form.displayName,
          ...(provider === "saml" && {
            samlIdpSsoUrl: form.samlIdpSsoUrl,
            samlIdpIssuer: form.samlIdpIssuer,
            samlIdpCert: form.samlIdpCert,
            samlSpEntityId: form.samlSpEntityId,
          }),
          ...(provider === "oidc" && {
            oidcIssuerUrl: form.oidcIssuerUrl,
            oidcClientId: form.oidcClientId,
            oidcClientSecret: form.oidcClientSecret,
            oidcScopes: form.oidcScopes,
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save");
        return;
      }

      setSuccess(provider);
      setTimeout(() => setSuccess(null), 3000);
      await loadConfigs();
    } catch {
      setError("Failed to save SSO configuration");
    } finally {
      setSaving(null);
    }
  }

  function copyMetadataUrl() {
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(`${appUrl}/api/auth/sso/saml/metadata`);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-medium">Single Sign-On (SSO)</h2>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Tabs defaultValue="saml">
        <TabsList className="mb-4">
          <TabsTrigger value="saml">SAML 2.0</TabsTrigger>
          <TabsTrigger value="oidc">OAuth / OIDC</TabsTrigger>
        </TabsList>

        {/* SAML Tab */}
        <TabsContent value="saml" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Enable SAML SSO</div>
              <div className="text-xs text-muted-foreground">
                Allow users to sign in via SAML 2.0 identity provider
              </div>
            </div>
            <Switch
              checked={saml.enabled}
              onCheckedChange={(checked) =>
                setSaml((s) => ({ ...s, enabled: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Label</label>
            <Input
              placeholder="Sign in with ADFS"
              value={saml.displayName}
              onChange={(e) =>
                setSaml((s) => ({ ...s, displayName: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">IdP SSO URL</label>
              <Input
                placeholder="https://adfs.corp.com/adfs/ls"
                value={saml.samlIdpSsoUrl}
                onChange={(e) =>
                  setSaml((s) => ({ ...s, samlIdpSsoUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IdP Entity ID</label>
              <Input
                placeholder="https://adfs.corp.com/adfs/services/trust"
                value={saml.samlIdpIssuer}
                onChange={(e) =>
                  setSaml((s) => ({ ...s, samlIdpIssuer: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              IdP Signing Certificate (PEM)
            </label>
            <Textarea
              placeholder="-----BEGIN CERTIFICATE-----&#10;MIICpDCCAYwCCQDU...&#10;-----END CERTIFICATE-----"
              className="font-mono text-xs"
              rows={4}
              value={saml.samlIdpCert}
              onChange={(e) =>
                setSaml((s) => ({ ...s, samlIdpCert: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">SP Entity ID</label>
            <Input
              placeholder="Auto-generated from APP_URL if empty"
              value={saml.samlSpEntityId}
              onChange={(e) =>
                setSaml((s) => ({ ...s, samlSpEntityId: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={copyMetadataUrl}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy SP Metadata URL
            </Button>
            <span className="text-xs text-muted-foreground">
              Provide this URL to your IdP administrator
            </span>
          </div>

          <div className="flex justify-end gap-2">
            {success === "saml" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
            <Button
              className="gap-1.5"
              onClick={() => handleSave("saml")}
              disabled={saving === "saml"}
            >
              {saving === "saml" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save SAML
            </Button>
          </div>
        </TabsContent>

        {/* OIDC Tab */}
        <TabsContent value="oidc" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Enable OAuth / OIDC</div>
              <div className="text-xs text-muted-foreground">
                Allow users to sign in via OpenID Connect provider
              </div>
            </div>
            <Switch
              checked={oidc.enabled}
              onCheckedChange={(checked) =>
                setOidc((s) => ({ ...s, enabled: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Button Label</label>
            <Input
              placeholder="Sign in with Azure AD"
              value={oidc.displayName}
              onChange={(e) =>
                setOidc((s) => ({ ...s, displayName: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Issuer URL</label>
            <Input
              placeholder="https://login.microsoftonline.com/{tenant}/v2.0"
              value={oidc.oidcIssuerUrl}
              onChange={(e) =>
                setOidc((s) => ({ ...s, oidcIssuerUrl: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Must support OIDC Discovery
              (/.well-known/openid-configuration)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID</label>
              <Input
                value={oidc.oidcClientId}
                onChange={(e) =>
                  setOidc((s) => ({ ...s, oidcClientId: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <Input
                type="password"
                value={oidc.oidcClientSecret}
                onChange={(e) =>
                  setOidc((s) => ({
                    ...s,
                    oidcClientSecret: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Scopes</label>
            <Input
              placeholder="openid email profile"
              value={oidc.oidcScopes}
              onChange={(e) =>
                setOidc((s) => ({ ...s, oidcScopes: e.target.value }))
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            {success === "oidc" && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
            <Button
              className="gap-1.5"
              onClick={() => handleSave("oidc")}
              disabled={saving === "oidc"}
            >
              {saving === "oidc" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save OIDC
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
