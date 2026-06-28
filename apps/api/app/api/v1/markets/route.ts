import { eq } from "drizzle-orm";
import { HyperliquidMarketCatalog, type MarketCatalog } from "@hypedca/core";
import { getDb } from "../../../../lib/db/index";
import { marketCache } from "../../../../lib/db/schema";
import { json, options } from "../../../../lib/http";

export const runtime = "nodejs";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const environment = url.searchParams.get("environment") === "testnet" ? "testnet" : "mainnet";
  const db = getDb();
  const [cached] = await db.select().from(marketCache).where(eq(marketCache.environment, environment));
  if (cached && Date.now() - cached.fetchedAt.getTime() < 60_000) {
    return json(cached.catalog);
  }
  const catalog: MarketCatalog = await new HyperliquidMarketCatalog(environment).getCatalog();
  await db
    .insert(marketCache)
    .values({ environment, catalog, fetchedAt: new Date(catalog.fetchedAt) })
    .onConflictDoUpdate({ target: marketCache.environment, set: { catalog, fetchedAt: new Date(catalog.fetchedAt) } });
  return json(catalog);
}
