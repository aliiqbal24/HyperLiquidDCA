import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const cadenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("interval"),
    everyMinutes: z.number().int().min(5).max(60 * 24 * 30),
  }),
  z.object({
    kind: z.literal("daily"),
    time: z.string().regex(timePattern),
  }),
  z.object({
    kind: z.literal("weekly"),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).max(7),
    time: z.string().regex(timePattern),
  }),
  z.object({
    kind: z.literal("monthly"),
    dayOfMonth: z.number().int().min(1).max(31),
    time: z.string().regex(timePattern),
  }),
]);

export const scheduleSchema = z
  .object({
    id: z.string().min(1),
    accountId: z.string().min(1),
    label: z.string().min(1).max(80),
    marketType: z.enum(["spot", "perp"]),
    asset: z.string().min(1).max(32),
    assetId: z.number().int().nonnegative().optional(),
    assetDisplayName: z.string().min(1).max(80).optional(),
    side: z.enum(["buy", "sell", "long", "short"]),
    notionalUsd: z.number().positive().max(5_000_000),
    cadence: cadenceSchema,
    timezone: z.string().min(1),
    startAt: z.string().datetime(),
    nextRunAt: z.string().datetime(),
    lastRunAt: z.string().datetime().optional(),
    runCount: z.number().int().nonnegative(),
    status: z.enum(["active", "paused", "failed"]),
    executorMode: z.enum(["browser", "cloud"]),
    leverage: z.number().int().min(1).max(50).optional(),
    marginMode: z.enum(["isolated", "cross"]).optional(),
    maxLeverageAtCreation: z.number().int().min(1).max(100).optional(),
    risk: z.object({
      maxSlippageBps: z.number().int().min(1).max(300),
      maxRuns: z.number().int().positive().optional(),
      endAt: z.string().datetime().optional(),
      maxPositionUsd: z.number().positive().optional(),
    }),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((value, ctx) => {
    if (value.marketType === "spot" && !["buy", "sell"].includes(value.side)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["side"], message: "Spot schedules must buy or sell." });
    }

    if (value.marketType === "perp" && !["long", "short"].includes(value.side)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["side"], message: "Perp schedules must long or short." });
    }

    if (value.marketType === "perp" && !value.leverage) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["leverage"], message: "Perp schedules require leverage." });
    }
  });

export const credentialSchema = z.object({
  accountAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  environment: z.enum(["mainnet", "testnet"]),
});
