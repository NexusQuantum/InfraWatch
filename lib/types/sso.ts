export type SsoProviderId = "saml" | "oidc";

export interface SsoConfig {
  id: SsoProviderId;
  enabled: boolean;
  displayName: string;
  // SAML fields
  samlIdpSsoUrl?: string;
  samlIdpIssuer?: string;
  samlIdpCert?: string;
  samlSpEntityId?: string;
  // OIDC fields
  oidcIssuerUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcScopes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SsoConfigInput {
  id: SsoProviderId;
  enabled: boolean;
  displayName: string;
  samlIdpSsoUrl?: string;
  samlIdpIssuer?: string;
  samlIdpCert?: string;
  samlSpEntityId?: string;
  oidcIssuerUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcScopes?: string;
}

export interface SsoProviderSummary {
  id: SsoProviderId;
  displayName: string;
}
