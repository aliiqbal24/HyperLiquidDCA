import { createDecipheriv } from "node:crypto";

export interface EncryptedSecret {
  algorithm: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
}

export function decryptJson<T>(secret: EncryptedSecret, base64Key: string): T {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("HYPEDCA_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
  decipher.setAuthTag(Buffer.from(secret.tag, "base64"));
  const cleartext = Buffer.concat([decipher.update(Buffer.from(secret.ciphertext, "base64")), decipher.final()]);
  return JSON.parse(cleartext.toString("utf8")) as T;
}
