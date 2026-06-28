import { randomBytes } from "node:crypto";

console.log(`HYPEDCA_ENCRYPTION_KEY_BASE64=${randomBytes(32).toString("base64")}`);
console.log(`CRON_SECRET=${randomBytes(32).toString("base64url")}`);
