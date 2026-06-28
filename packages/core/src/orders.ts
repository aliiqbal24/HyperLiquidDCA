import Decimal from "decimal.js";
import type { DcaSchedule, MarketSnapshot, OrderPlan } from "./types.js";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";
import { makeCloid } from "./ids.js";

export function createOrderPlan(schedule: DcaSchedule, market: MarketSnapshot, scheduledFor = schedule.nextRunAt): OrderPlan {
  if (schedule.asset.toUpperCase() !== market.asset.toUpperCase()) {
    throw new Error(`Market snapshot ${market.asset} does not match schedule asset ${schedule.asset}.`);
  }

  const mid = new Decimal(market.midPrice);
  if (!mid.isFinite() || mid.lte(0)) throw new Error("Invalid market mid price.");

  const size = formatSize(new Decimal(schedule.notionalUsd).div(mid).toFixed(), market.szDecimals);
  if (new Decimal(size).lte(0)) throw new Error("Order size is below lot size.");

  const isBuy = schedule.side === "buy" || schedule.side === "long";
  const slippageMultiplier = new Decimal(schedule.risk.maxSlippageBps).div(10_000);
  const rawLimit = isBuy ? mid.mul(new Decimal(1).plus(slippageMultiplier)) : mid.mul(new Decimal(1).minus(slippageMultiplier));

  return {
    assetId: schedule.assetId ?? market.assetId,
    asset: schedule.asset,
    isBuy,
    size,
    limitPrice: formatPrice(rawLimit.toFixed(), market.szDecimals, schedule.marketType),
    reduceOnly: false,
    tif: "Ioc",
    marketType: schedule.marketType,
    cloid: makeCloid(schedule.id, scheduledFor),
    ...(schedule.leverage === undefined ? {} : { leverage: schedule.leverage }),
    ...(schedule.marginMode === undefined ? {} : { marginMode: schedule.marginMode }),
  };
}

export function roundToTick(value: Decimal.Value, tickSize: Decimal.Value, direction: "up" | "down"): string {
  const decimal = new Decimal(value);
  const tick = new Decimal(tickSize);
  const ticks = decimal.div(tick);
  return ticks[direction === "up" ? "ceil" : "floor"]().mul(tick).toFixed();
}

export function roundDownToStep(value: Decimal.Value, step: Decimal.Value): string {
  const decimal = new Decimal(value);
  const stepDecimal = new Decimal(step);
  return decimal.div(stepDecimal).floor().mul(stepDecimal).toFixed();
}
