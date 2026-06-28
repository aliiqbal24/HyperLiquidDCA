export type BillingPlan = "free" | "cloud";

export const HYPEDCA_CLOUD_PLAN = {
  id: "cloud" as const,
  name: "HypeDCA Cloud",
  monthlyUsd: 9,
  dailyCloudPurchases: 20,
  stripeLookupKey: "hypedca_cloud_monthly_9_usd",
};

export function isActiveCloudPlan(plan: BillingPlan | string, subscriptionStatus: string): boolean {
  return plan === HYPEDCA_CLOUD_PLAN.id && ["active", "trialing"].includes(subscriptionStatus);
}
