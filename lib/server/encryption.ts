import "server-only";

import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";

export function getEncryptionKey(): Buffer {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY || process.env.PROMETHEUS_CONNECTOR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("CONNECTOR_ENCRYPTION_KEY is required for secret storage");
  }
  if (process.env.NODE_ENV === "production") {
    if (raw === "local-dev-connector-key-change-me" || raw.length < 16) {
      throw new Error(
        "CONNECTOR_ENCRYPTION_KEY is too weak for production. Use a strong key (at least 16 characters)."
      );
    }
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptString(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptString(ciphertext: string): string {
  if (ciphertext.startsWith("plain:")) {
    return Buffer.from(ciphertext.slice("plain:".length), "base64").toString("utf8");
  }
  const key = getEncryptionKey();
  const [ivB64, tagB64, encB64] = ciphertext.split(".");
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error("Corrupted encrypted value");
  }
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
