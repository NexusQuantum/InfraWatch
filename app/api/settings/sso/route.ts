import { NextRequest, NextResponse } from "next/server";
import { requireSession, getClientIp } from "@/lib/server/require-session";
import { listAllSsoConfigs, upsertSsoConfig } from "@/lib/server/sso-store";
import { logAudit } from "@/lib/server/audit";
import type { SsoConfigInput, SsoProviderId } from "@/lib/types";

export async function GET(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  try {
    const configs = await listAllSsoConfigs();

    // Redact secrets before sending to client
    const redacted = configs.map((c) => ({
      ...c,
      samlIdpCert: c.samlIdpCert ? "••••••••" : undefined,
      oidcClientSecret: c.oidcClientSecret ? "••••••••" : undefined,
    }));

    return NextResponse.json({ configs: redacted });
  } catch (error) {
    console.error("[settings/sso] GET error:", error);
    return NextResponse.json({ error: "Failed to load SSO configs" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireSession(request);
  if (denied) return denied;

  const ip = getClientIp(request);

  try {
    const body = await request.json();

    const id = body.id as SsoProviderId;
    if (id !== "saml" && id !== "oidc") {
      return NextResponse.json({ error: "Invalid provider ID" }, { status: 400 });
    }

    const input: SsoConfigInput = {
      id,
      enabled: Boolean(body.enabled),
      displayName: String(body.displayName || ""),
      samlIdpSsoUrl: body.samlIdpSsoUrl || undefined,
      samlIdpIssuer: body.samlIdpIssuer || undefined,
      samlSpEntityId: body.samlSpEntityId || undefined,
      oidcIssuerUrl: body.oidcIssuerUrl || undefined,
      oidcClientId: body.oidcClientId || undefined,
      oidcScopes: body.oidcScopes || undefined,
    };

    // Only update secrets if a new value is provided (not the redacted placeholder)
    if (body.samlIdpCert && body.samlIdpCert !== "••••••••") {
      input.samlIdpCert = body.samlIdpCert;
    }
    if (body.oidcClientSecret && body.oidcClientSecret !== "••••••••") {
      input.oidcClientSecret = body.oidcClientSecret;
    }

    const config = await upsertSsoConfig(input);

    await logAudit("sso.config_updated", {
      detail: { provider: id, enabled: input.enabled },
      ip,
    });

    // Return with secrets redacted
    return NextResponse.json({
      ok: true,
      config: {
        ...config,
        samlIdpCert: config.samlIdpCert ? "••••••••" : undefined,
        oidcClientSecret: config.oidcClientSecret ? "••••••••" : undefined,
      },
    });
  } catch (error) {
    console.error("[settings/sso] PUT error:", error);
    return NextResponse.json({ error: "Failed to save SSO config" }, { status: 500 });
  }
}
