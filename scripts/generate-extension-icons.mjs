import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const sizes = [16, 32, 48, 128];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(repoRoot, "apps/extension/public");
mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (size * y + x) << 2;
      const inset = Math.max(1, Math.round(size * 0.08));
      const inside = x >= inset && y >= inset && x < size - inset && y < size - inset;
      png.data[idx] = inside ? 7 : 0;
      png.data[idx + 1] = inside ? 17 : 0;
      png.data[idx + 2] = inside ? 15 : 0;
      png.data[idx + 3] = inside ? 255 : 0;
    }
  }

  drawLine(png, size, 0.22, 0.64, 0.42, 0.31);
  drawLine(png, size, 0.42, 0.31, 0.55, 0.58);
  drawLine(png, size, 0.55, 0.58, 0.68, 0.40);
  drawLine(png, size, 0.68, 0.40, 0.80, 0.64);
  writeFileSync(resolve(outDir, `icon-${size}.png`), PNG.sync.write(png));
}

function drawLine(png, size, ax, ay, bx, by) {
  const x1 = Math.round(ax * size);
  const y1 = Math.round(ay * size);
  const x2 = Math.round(bx * size);
  const y2 = Math.round(by * size);
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
  const radius = Math.max(1, Math.round(size * 0.045));
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x1 + ((x2 - x1) * i) / steps);
    const y = Math.round(y1 + ((y2 - y1) * i) / steps);
    drawDot(png, size, x, y, radius);
  }
}

function drawDot(png, size, cx, cy, radius) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const idx = (size * y + x) << 2;
      png.data[idx] = 56;
      png.data[idx + 1] = 242;
      png.data[idx + 2] = 178;
      png.data[idx + 3] = 255;
    }
  }
}
