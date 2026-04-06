import "server-only";

import * as client from "openid-client";
import type { SsoConfig } from "@/lib/types";

export interface OidcLoginResult {
  email: string;
  name?: string;
  sub: string;
}

// Temporarily disable TLS verification for self-signed IdP certs
// (common in air-gapped / enterprise environments with internal CAs).
// Scoped: set before OIDC calls, restored immediately after.
function withInsecureTls<T>(fn: () => T): T {
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  try {
    const result = fn();
    // Handle promises: restore env after async completion
    if (result instanceof Promise) {
      return result.finally(() => {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev ?? "1";
      }) as T;
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev ?? "1";
    return result;
  } catch (e) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev ?? "1";
    throw e;
  }
}

async function discover(config: SsoConfig) {
  if (!config.oidcIssuerUrl || !config.oidcClientId) {
    throw new Error("OIDC issuer URL and client ID are required");
  }

  const issuerUrl = new URL(config.oidcIssuerUrl);

  const oidcConfig = await withInsecureTls(() =>
    client.discovery(
      issuerUrl,
      config.oidcClientId!,
      config.oidcClientSecret
        ? { token_endpoint_auth_method: "client_secret_post" }
        : undefined,
      config.oidcClientSecret
        ? client.ClientSecretPost(config.oidcClientSecret)
        : client.None(),
      {
        execute: [client.allowInsecureRequests],
      }
    )
  );

  return oidcConfig;
}

export async function createOidcAuthUrl(
  config: SsoConfig,
  callbackUrl: string,
  state: string,
  nonce: string,
  codeVerifier: string
): Promise<string> {
  const oidcConfig = await discover(config);

  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const scopes = config.oidcScopes || "openid email profile";

  const url = client.buildAuthorizationUrl(oidcConfig, {
    redirect_uri: callbackUrl,
    scope: scopes,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return url.href;
}

export async function handleOidcCallback(
  config: SsoConfig,
  callbackUrl: string,
  currentUrl: URL,
  expectedState: string,
  nonce: string,
  codeVerifier: string
): Promise<OidcLoginResult> {
  const oidcConfig = await discover(config);

  const tokenResponse = await withInsecureTls(() =>
    client.authorizationCodeGrant(
      oidcConfig,
      currentUrl,
      {
        expectedState,
        expectedNonce: nonce,
        pkceCodeVerifier: codeVerifier,
      }
    )
  );

  const claims = tokenResponse.claims();
  if (!claims) {
    throw new Error("No ID token claims returned");
  }

  const email =
    (claims.email as string) ||
    (claims.preferred_username as string) ||
    (claims.sub as string);
  const name =
    (claims.name as string) ||
    [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
    undefined;

  return {
    email,
    name,
    sub: claims.sub as string,
  };
}
