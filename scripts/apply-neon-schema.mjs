import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";

loadEnvFile(resolve(".env.local"));
loadEnvFile(resolve(".env.production.local"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Pull Vercel envs or set DATABASE_URL locally before running this script.");
}

const files = [
  resolve("apps/api/db/schema.sql"),
  resolve("apps/api/db/0001_add_execution_log_status.sql"),
];
const sql = neon(databaseUrl);

for (const file of files) {
  const statements = splitSql(readFileSync(file, "utf8"));
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log(`Applied ${file}`);
}

const tables = await sql`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`;
console.log(`Verified tables: ${tables.map((row) => row.table_name).join(", ")}`);

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

function splitSql(text) {
  return text
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}
