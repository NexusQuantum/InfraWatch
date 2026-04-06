import "server-only";

import { SAML, generateServiceProviderMetadata } from "@node-saml/node-saml";
import { ValidateInResponseTo } from "@node-saml/node-saml";
import type { SsoConfig } from "@/lib/types";

export interface SamlLoginResult {
  email: string;
  name?: string;
  nameId: string;
  sessionIndex?: string;
}

function buildSamlClient(config: SsoConfig, callbackUrl: string): SAML {
  if (!config.samlIdpSsoUrl || !config.samlIdpCert) {
    throw new Error("SAML IdP SSO URL and certificate are required");
  }

  return new SAML({
    entryPoint: config.samlIdpSsoUrl,
    issuer: config.samlSpEntityId || callbackUrl.replace("/api/auth/sso/saml/callback", "/saml/metadata"),
    idpCert: config.samlIdpCert,
    callbackUrl,
    idpIssuer: config.samlIdpIssuer,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    acceptedClockSkewMs: 5 * 60 * 1000, // 5 minutes for air-gapped environments
    validateInResponseTo: ValidateInResponseTo.never,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    disableRequestedAuthnContext: true,
  });
}

export async function createSamlLoginRequest(
  config: SsoConfig,
  callbackUrl: string
): Promise<string> {
  const saml = buildSamlClient(config, callbackUrl);
  const url = await saml.getAuthorizeUrlAsync("", callbackUrl, {});
  return url;
}

export async function validateSamlResponse(
  config: SsoConfig,
  callbackUrl: string,
  body: Record<string, string>
): Promise<SamlLoginResult> {
  const saml = buildSamlClient(config, callbackUrl);
  const { profile } = await saml.validatePostResponseAsync(body);

  if (!profile) {
    throw new Error("SAML assertion did not contain a valid profile");
  }

  const email =
    (profile.email as string) ||
    (profile.mail as string) ||
    (profile["urn:oid:0.9.2342.19200300.100.1.3"] as string) ||
    profile.nameID;

  const name =
    (profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ||
    (profile.displayName as string) ||
    (profile.cn as string) ||
    undefined;

  return {
    email,
    name,
    nameId: profile.nameID,
    sessionIndex: profile.sessionIndex,
  };
}

export function generateSpMetadata(
  config: SsoConfig,
  callbackUrl: string
): string {
  const entityId = config.samlSpEntityId || callbackUrl.replace("/api/auth/sso/saml/callback", "/saml/metadata");

  return generateServiceProviderMetadata({
    issuer: entityId,
    callbackUrl,
    wantAssertionsSigned: true,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
  });
}
