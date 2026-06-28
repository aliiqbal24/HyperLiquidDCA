import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { SymbolConverter } from "@nktkas/hyperliquid/utils";
import { Wallet } from "ethers";
import type { ExecutionResult, HyperliquidCredential, MarketSnapshot, OrderPlan } from "./types.js";

export interface TradingAdapter {
  getMarketSnapshot(asset: string, marketType: "spot" | "perp"): Promise<MarketSnapshot>;
  submitOrder(plan: OrderPlan): Promise<ExecutionResult>;
}

export class HyperliquidSdkAdapter implements TradingAdapter {
  private readonly info: InfoClient;
  private readonly exchange: ExchangeClient;

  constructor(private readonly credential: HyperliquidCredential) {
    const transport = new HttpTransport({ isTestnet: credential.environment === "testnet" });
    const wallet = new Wallet(credential.privateKey);
    this.info = new InfoClient({ transport });
    this.exchange = new ExchangeClient({ transport, wallet });
  }

  async getMarketSnapshot(asset: string, marketType: "spot" | "perp"): Promise<MarketSnapshot> {
    const converter = await SymbolConverter.create({ transport: new HttpTransport({ isTestnet: this.credential.environment === "testnet" }) });
    const mids = (await this.info.allMids()) as Record<string, string>;
    const midPrice = mids[asset] ?? mids[asset.toUpperCase()];
    if (!midPrice) throw new Error(`No Hyperliquid mid price found for ${asset}.`);

    if (marketType === "perp") {
      const meta = (await this.info.meta()) as { universe?: Array<{ name: string; szDecimals?: number }> };
      const assetId = meta.universe?.findIndex((item) => item.name.toUpperCase() === asset.toUpperCase()) ?? -1;
      if (assetId < 0) throw new Error(`No perp asset id found for ${asset}.`);
      const decimals = converter.getSzDecimals(asset) ?? meta.universe?.[assetId]?.szDecimals ?? 4;
      return { asset, assetId: converter.getAssetId(asset) ?? assetId, midPrice, szDecimals: decimals };
    }

    const spotMeta = (await this.info.spotMeta()) as {
      tokens?: Array<{ name: string; szDecimals?: number }>;
      universe?: Array<{ name: string; tokens: number[]; index: number }>;
    };
    const pair = spotMeta.universe?.find((item) => item.name.toUpperCase() === asset.toUpperCase());
    if (!pair) throw new Error(`No spot pair found for ${asset}.`);
    const baseTokenIndex = pair.tokens[0];
    const baseToken = baseTokenIndex === undefined ? undefined : spotMeta.tokens?.[baseTokenIndex];
    return {
      asset,
      assetId: converter.getAssetId(asset) ?? pair.index,
      midPrice,
      szDecimals: converter.getSzDecimals(asset) ?? baseToken?.szDecimals ?? 4,
    };
  }

  async submitOrder(plan: OrderPlan): Promise<ExecutionResult> {
    if (plan.marketType === "perp" && plan.leverage) {
      await this.exchange.updateLeverage({
        asset: plan.assetId,
        isCross: plan.marginMode === "cross",
        leverage: plan.leverage,
      });
    }

    const result = (await this.exchange.order({
      orders: [
        {
          a: plan.assetId,
          b: plan.isBuy,
          p: plan.limitPrice,
          s: plan.size,
          r: plan.reduceOnly,
          t: { limit: { tif: plan.tif } },
          c: plan.cloid,
        },
      ],
      grouping: "na",
    })) as unknown;

    return parseOrderResult(result);
  }
}

function parseOrderResult(result: unknown): ExecutionResult {
  const text = JSON.stringify(result);
  const status = extractFirstStatus(result);
  if (typeof status === "object" && status !== null && "error" in status) {
    return { status: "failed", message: text };
  }

  if (typeof status === "object" && status !== null && "filled" in status) {
    const filled = (status as { filled: { oid: number; totalSz: string; avgPx: string; cloid?: `0x${string}` } }).filled;
    return {
      status: "filled",
      orderId: String(filled.oid),
      filledSize: filled.totalSz,
      averagePrice: filled.avgPx,
      ...(filled.cloid ? { cloid: filled.cloid } : {}),
      message: text,
    };
  }

  if (typeof status === "object" && status !== null && "resting" in status) {
    const resting = (status as { resting: { oid: number; cloid?: `0x${string}` } }).resting;
    return {
      status: "submitted",
      orderId: String(resting.oid),
      ...(resting.cloid ? { cloid: resting.cloid } : {}),
      message: text,
    };
  }

  return { status: "submitted", message: text };
}

function extractFirstStatus(result: unknown): unknown {
  if (typeof result !== "object" || result === null) return undefined;
  const response = (result as { response?: { data?: { statuses?: unknown[] } } }).response;
  return response?.data?.statuses?.[0];
}
