import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.argv[2] ?? ".env.production.local");
const target = process.argv[3] ?? "production";
const values = parseEnvFile(file);
const required = [
  "DATABASE_URL",
  "HYPEDCA_ENCRYPTION_KEY_BASE64",
  "CRON_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_CLOUD_MONTHLY",
];

for (const key of required) {
  if (!values[key]) throw new Error(`${key} is missing from ${file}.`);
}

for (const key of required) {
  console.log(`Setting ${key} for ${target}`);
  spawnSync("vercel", ["env", "rm", key, target, "--yes"], { stdio: "ignore" });
  const result = spawnSync("vercel", ["env", "add", key, target, "--sensitive"], {
    input: values[key],
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function parseEnvFile(path) {
  const text = readFileSync(path, "utf8");
  const output = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    output[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return output;
}
