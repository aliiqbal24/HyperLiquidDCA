import { HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { SymbolConverter } from "@nktkas/hyperliquid/utils";
import type { AccountAssetConstraints, HyperliquidCredential, MarketAsset, MarketCatalog, MarketType } from "./types.js";

type PerpMeta = {
  universe?: Array<{
    name: string;
    szDecimals: number;
    maxLeverage: number;
    isDelisted?: true;
    onlyIsolated?: true;
    marginMode?: "strictIsolated" | "noCross";
  }>;
};

type SpotMeta = {
  universe?: Array<{ name: string; index: number; isDelisted?: true }>;
  tokens?: Array<{ name: string; szDecimals: number }>;
};

type AssetCtx = {
  midPx?: string;
  markPx?: string;
  prevDayPx?: string;
  dayNtlVlm?: string;
};

export class HyperliquidMarketCatalog {
  private readonly info: InfoClient;
  private readonly transport: HttpTransport;

  constructor(private readonly environment: "mainnet" | "testnet" = "mainnet") {
    this.transport = new HttpTransport({ isTestnet: environment === "testnet" });
    this.info = new InfoClient({ transport: this.transport });
  }

  async getCatalog(): Promise<MarketCatalog> {
    const converter = await SymbolConverter.create({ transport: this.transport });
    const [[perpMeta, perpCtxs], [spotMeta, spotCtxs]] = await Promise.all([
      this.info.metaAndAssetCtxs() as Promise<[PerpMeta, AssetCtx[]]>,
      this.info.spotMetaAndAssetCtxs() as Promise<[SpotMeta, AssetCtx[]]>,
    ]);

    const perps = (perpMeta.universe ?? []).flatMap<MarketAsset>((asset, index) => {
      const assetId = converter.getAssetId(asset.name) ?? index;
      const ctx = perpCtxs[index] ?? {};
      return [
        {
          key: `perp:${asset.name}`,
          symbol: asset.name,
          displayName: `${asset.name}-PERP`,
          marketType: "perp",
          assetId,
          szDecimals: converter.getSzDecimals(asset.name) ?? asset.szDecimals,
          maxLeverage: asset.maxLeverage,
          marginModes: marginModesForPerp(asset),
          isDelisted: asset.isDelisted === true,
          ...(ctx.midPx ? { midPrice: ctx.midPx } : {}),
          ...(ctx.markPx ? { markPrice: ctx.markPx } : {}),
          ...(ctx.prevDayPx ? { prevDayPrice: ctx.prevDayPx } : {}),
          ...(ctx.dayNtlVlm ? { dayNotionalVolume: ctx.dayNtlVlm } : {}),
        },
      ];
    });

    const spots = (spotMeta.universe ?? []).flatMap<MarketAsset>((pair, index) => {
      const assetId = converter.getAssetId(pair.name);
      if (assetId === undefined) return [];
      const ctx = spotCtxs[index] ?? {};
      return [
        {
          key: `spot:${pair.name}`,
          symbol: pair.name,
          displayName: pair.name,
          marketType: "spot",
          assetId,
          szDecimals: converter.getSzDecimals(pair.name) ?? 4,
          marginModes: [],
          isDelisted: pair.isDelisted === true,
          ...(ctx.midPx ? { midPrice: ctx.midPx } : {}),
          ...(ctx.markPx ? { markPrice: ctx.markPx } : {}),
          ...(ctx.prevDayPx ? { prevDayPrice: ctx.prevDayPx } : {}),
          ...(ctx.dayNtlVlm ? { dayNotionalVolume: ctx.dayNtlVlm } : {}),
        },
      ];
    });

    return {
      environment: this.environment,
      fetchedAt: new Date().toISOString(),
      assets: [...perps, ...spots].sort((a, b) => sortAsset(a, b)),
    };
  }

  async getAccountConstraints(credential: Pick<HyperliquidCredential, "accountAddress">, asset: string, marketType: MarketType): Promise<AccountAssetConstraints> {
    if (marketType === "spot") return { asset, marketType, marginModes: [] };

    const active = await this.info.activeAssetData({ user: credential.accountAddress, coin: asset });
    return {
      asset,
      marketType,
      currentLeverage: active.leverage.value,
      maxLeverage: active.leverage.value,
      marginModes: active.leverage.type === "cross" ? ["cross", "isolated"] : ["isolated", "cross"],
      availableToTrade: active.availableToTrade,
      maxTradeSize: active.maxTradeSzs,
    };
  }
}

export function searchMarketCatalog(catalog: MarketCatalog, query: string, marketType: MarketType | "all" = "all", limit = 40): MarketAsset[] {
  const needle = query.trim().toUpperCase();
  return catalog.assets
    .filter((asset) => marketType === "all" || asset.marketType === marketType)
    .filter((asset) => !needle || asset.symbol.toUpperCase().includes(needle) || asset.displayName.toUpperCase().includes(needle))
    .sort((a, b) => scoreMarket(b, needle) - scoreMarket(a, needle) || sortAsset(a, b))
    .slice(0, limit);
}

function marginModesForPerp(asset: NonNullable<PerpMeta["universe"]>[number]): Array<"isolated" | "cross"> {
  if (asset.onlyIsolated || asset.marginMode === "strictIsolated" || asset.marginMode === "noCross") return ["isolated"];
  return ["isolated", "cross"];
}

function sortAsset(a: MarketAsset, b: MarketAsset): number {
  const aVolume = Number(a.dayNotionalVolume ?? 0);
  const bVolume = Number(b.dayNotionalVolume ?? 0);
  if (bVolume !== aVolume) return bVolume - aVolume;
  return a.displayName.localeCompare(b.displayName);
}

function scoreMarket(asset: MarketAsset, needle: string): number {
  if (!needle) return Number(asset.dayNotionalVolume ?? 0);
  const symbol = asset.symbol.toUpperCase();
  const display = asset.displayName.toUpperCase();
  let score = 0;
  if (symbol === needle || display === needle) score += 1_000_000;
  if (symbol.startsWith(needle) || display.startsWith(needle)) score += 100_000;
  if (symbol.includes(needle) || display.includes(needle)) score += 10_000;
  score += Math.min(Number(asset.dayNotionalVolume ?? 0) / 1_000_000, 5_000);
  return score;
}
