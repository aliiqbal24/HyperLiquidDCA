import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import type { DcaSchedule, ExecutionLog } from "@hypedca/core";
import type { EncryptedSecret } from "../security/crypto";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  email: text("email"),
  plan: text("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status").notNull().default("inactive"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountTokens = pgTable("account_tokens", {
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.accountId, table.tokenHash] }),
}));

export const credentials = pgTable("credentials", {
  accountId: text("account_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  secret: jsonb("secret").$type<EncryptedSecret>().notNull(),
  environment: text("environment").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schedules = pgTable("schedules", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  executorMode: text("executor_mode").notNull(),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  schedule: jsonb("schedule").$type<DcaSchedule>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  dueIdx: index("schedules_due_idx").on(table.executorMode, table.status, table.nextRunAt),
  accountIdx: index("schedules_account_idx").on(table.accountId),
}));

export const executionLocks = pgTable("execution_locks", {
  occurrenceId: text("occurrence_id").primaryKey(),
  scheduleId: text("schedule_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const executionLogs = pgTable("execution_logs", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  scheduleId: text("schedule_id").notNull(),
  status: text("status").notNull(),
  log: jsonb("log").$type<ExecutionLog>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  accountIdx: index("execution_logs_account_idx").on(table.accountId),
  scheduleIdx: index("execution_logs_schedule_idx").on(table.scheduleId),
  accountStatusCreatedIdx: index("execution_logs_account_status_created_idx").on(table.accountId, table.status, table.createdAt),
}));

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const marketCache = pgTable("market_cache", {
  environment: text("environment").primaryKey(),
  catalog: jsonb("catalog").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});
