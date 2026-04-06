import "server-only";

/**
 * Determine if cookies should use the `secure` flag based on APP_URL protocol.
 * - HTTPS deployment → secure: true
 * - HTTP deployment (common in air-gapped) → secure: false
 * - No APP_URL set → secure: false (safe default)
 */
export function isSecureCookie(): boolean {
  return (process.env.APP_URL || "").startsWith("https://");
}
