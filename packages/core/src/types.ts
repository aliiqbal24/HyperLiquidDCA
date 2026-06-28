export type ExecutorMode = "browser" | "cloud";
export type MarketType = "spot" | "perp";
export type SpotSide = "buy" | "sell";
export type PerpSide = "long" | "short";
export type TradeSide = SpotSide | PerpSide;
export type MarginMode = "isolated" | "cross";
export type ScheduleStatus = "active" | "paused" | "failed";
export type ExecutionStatus = "planned" | "filled" | "submitted" | "skipped" | "failed" | "paused";

export type Cadence =
  | { kind: "interval"; everyMinutes: number }
  | { kind: "daily"; time: string }
  | { kind: "weekly"; daysOfWeek: number[]; time: string }
  | { kind: "monthly"; dayOfMonth: number; time: string };

export interface RiskControls {
  maxSlippageBps: number;
  maxRuns?: number;
  endAt?: string;
  maxPositionUsd?: number;
}

export interface DcaSchedule {
  id: string;
  accountId: string;
  label: string;
  marketType: MarketType;
  asset: string;
  assetId?: number;
  assetDisplayName?: string;
  side: TradeSide;
  notionalUsd: number;
  cadence: Cadence;
  timezone: string;
  startAt: string;
  nextRunAt: string;
  lastRunAt?: string;
  runCount: number;
  status: ScheduleStatus;
  executorMode: ExecutorMode;
  leverage?: number;
  marginMode?: MarginMode;
  maxLeverageAtCreation?: number;
  risk: RiskControls;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionOccurrence {
  occurrenceId: string;
  scheduleId: string;
  scheduledFor: string;
}

export interface ExecutionLog {
  id: string;
  scheduleId: string;
  occurrenceId: string;
  status: ExecutionStatus;
  message: string;
  cloid?: `0x${string}`;
  orderId?: string;
  filledSize?: string;
  averagePrice?: string;
  submittedSize?: string;
  submittedLimitPrice?: string;
  createdAt: string;
}

export interface MarketSnapshot {
  asset: string;
  assetId: number;
  midPrice: string;
  szDecimals: number;
  markPrice?: string;
  tickSize?: string;
  lotSize?: string;
}

export interface OrderPlan {
  assetId: number;
  asset: string;
  isBuy: boolean;
  size: string;
  limitPrice: string;
  reduceOnly: boolean;
  tif: "Ioc";
  marketType: MarketType;
  cloid: `0x${string}`;
  leverage?: number;
  marginMode?: MarginMode;
}

export interface MarketAsset {
  key: string;
  symbol: string;
  displayName: string;
  marketType: MarketType;
  assetId: number;
  szDecimals: number;
  maxLeverage?: number;
  marginModes: MarginMode[];
  isDelisted: boolean;
  midPrice?: string;
  markPrice?: string;
  prevDayPrice?: string;
  dayNotionalVolume?: string;
}

export interface MarketCatalog {
  environment: "mainnet" | "testnet";
  fetchedAt: string;
  assets: MarketAsset[];
}

export interface AccountAssetConstraints {
  asset: string;
  marketType: MarketType;
  maxLeverage?: number;
  currentLeverage?: number;
  marginModes: MarginMode[];
  availableToTrade?: [string, string];
  maxTradeSize?: [string, string];
}

export interface HyperliquidCredential {
  accountAddress: `0x${string}`;
  privateKey: `0x${string}`;
  environment: "mainnet" | "testnet";
}

export interface ExecutionResult {
  status: "submitted" | "filled" | "failed";
  cloid?: `0x${string}`;
  orderId?: string;
  filledSize?: string;
  averagePrice?: string;
  message: string;
}
