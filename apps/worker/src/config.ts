export interface WorkerConfig {
  encryptionKeyBase64: string;
  dataFile: string;
}

export function loadConfig(): WorkerConfig {
  const encryptionKeyBase64 = process.env.HYPEDCA_ENCRYPTION_KEY_BASE64;
  if (!encryptionKeyBase64) {
    throw new Error("HYPEDCA_ENCRYPTION_KEY_BASE64 must be set to a 32-byte base64 key.");
  }

  return {
    encryptionKeyBase64,
    dataFile: process.env.HYPEDCA_DATA_FILE ?? "hypedca.local.db.json",
  };
}
