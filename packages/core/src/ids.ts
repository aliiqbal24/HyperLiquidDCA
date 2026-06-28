export function makeId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${suffix}`;
}

export function occurrenceId(scheduleId: string, scheduledFor: string): string {
  return `${scheduleId}:${scheduledFor}`;
}

export function makeCloid(scheduleId: string, scheduledFor: string): `0x${string}` {
  const input = new TextEncoder().encode(`${scheduleId}:${scheduledFor}`);
  let hash = 2166136261;
  for (const byte of input) {
    hash ^= byte;
    hash = Math.imul(hash, 16777619);
  }

  const parts = [
    hash >>> 0,
    Math.imul(hash ^ 0xa5a5a5a5, 2246822519) >>> 0,
    Math.imul(hash ^ 0x7f4a7c15, 3266489917) >>> 0,
    Math.imul(hash ^ 0x9e3779b9, 668265263) >>> 0,
  ];
  const hex = parts.map((part) => part.toString(16).padStart(8, "0")).join("");
  return `0x${hex}`;
}
