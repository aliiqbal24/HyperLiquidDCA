import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EncryptedSecret {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encryptJson(value: unknown): EncryptedSecret {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptJson<T>(secret: EncryptedSecret): T {
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
  const cleartext = Buffer.concat([decipher.update(Buffer.from(secret.ciphertext, "base64")), decipher.final()]);
  return JSON.parse(cleartext.toString("utf8")) as T;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newAccountToken(): string {
  return randomBytes(32).toString("base64url");
}

function getKey(): Buffer {
  const raw = process.env.HYPEDCA_ENCRYPTION_KEY_BASE64;
  if (!raw) throw new Error("HYPEDCA_ENCRYPTION_KEY_BASE64 is required.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("HYPEDCA_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
  return key;
}
