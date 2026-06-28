import { json, options } from "../../../lib/http";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export function GET() {
  return json({ ok: true, service: "hypedca-api" });
}
