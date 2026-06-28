import archiver from "archiver";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repoRoot, "apps/extension/dist");
const releaseDir = resolve(repoRoot, "release");
const manifestPath = resolve(distDir, "manifest.json");

if (!existsSync(manifestPath)) {
  throw new Error("Build the extension before packaging.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (process.env.HYPEDCA_INCLUDE_LOCALHOST !== "true") {
  manifest.host_permissions = (manifest.host_permissions ?? []).filter((permission) => !String(permission).startsWith("http://localhost"));
}
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

mkdirSync(releaseDir, { recursive: true });
const output = createWriteStream(resolve(releaseDir, "hypedca-extension.zip"));
const archive = archiver("zip", { zlib: { level: 9 } });

archive.pipe(output);
archive.directory(distDir, false);
const closed = new Promise((resolveClose, rejectClose) => {
  output.on("close", resolveClose);
  output.on("error", rejectClose);
  archive.on("error", rejectClose);
});
await archive.finalize();
await closed;
