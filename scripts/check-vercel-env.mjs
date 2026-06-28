import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const required = [
  "DATABASE_URL",
  "HYPEDCA_ENCRYPTION_KEY_BASE64",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_CLOUD_MONTHLY",
];

loadEnvFile(resolve(".env.local"));
loadEnvFile(resolve(".env.production.local"));

let missing = 0;
for (const key of required) {
  if (process.env[key]) {
    console.log(`ok ${key}`);
  } else {
    missing += 1;
    console.log(`missing ${key}`);
  }
}

if (missing > 0) {
  process.exitCode = 1;
}

function loadEnvFile(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}
