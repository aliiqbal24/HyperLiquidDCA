import Stripe from "stripe";
import { HYPEDCA_CLOUD_PLAN, type BillingPlan } from "@hypedca/core";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is required.");
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
  return stripe;
}

export function getCloudPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_CLOUD_MONTHLY;
  if (!priceId) throw new Error("STRIPE_PRICE_CLOUD_MONTHLY is required.");
  return priceId;
}

export function planForPrice(priceId: string | null | undefined): BillingPlan {
  if (priceId && priceId === process.env.STRIPE_PRICE_CLOUD_MONTHLY) return HYPEDCA_CLOUD_PLAN.id;
  return "free";
}
