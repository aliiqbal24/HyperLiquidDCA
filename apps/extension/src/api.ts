import type { BillingPlan, DcaSchedule, ExecutionLog, HyperliquidCredential, MarketCatalog } from "@hypedca/core";
import { getCloudAccountId, getCloudAccountToken, saveCloudAccount } from "./storage.js";

interface CloudAccount {
  id: string;
  token: string;
  plan: BillingPlan;
}

export class HypeDcaApiClient {
  constructor(private readonly baseUrl: string) {}

  async ensureAccount(): Promise<string> {
    const [existing, token] = await Promise.all([getCloudAccountId(), getCloudAccountToken()]);
    if (existing && token) return existing;

    const account = await this.request<CloudAccount>("/v1/accounts", {
      method: "POST",
      body: JSON.stringify({}),
    });
    await saveCloudAccount(account.id, account.token);
    return account.id;
  }

  async uploadCredential(accountId: string, credential: HyperliquidCredential): Promise<void> {
    await this.request("/v1/credentials", {
      method: "POST",
      headers: await this.authHeaders(accountId),
      body: JSON.stringify(credential),
    });
  }

  async createCloudSchedule(accountId: string, schedule: DcaSchedule): Promise<DcaSchedule> {
    return this.request<DcaSchedule>("/v1/schedules", {
      method: "POST",
      headers: await this.authHeaders(accountId),
      body: JSON.stringify(schedule),
    });
  }

  async getMarketCatalog(environment: "mainnet" | "testnet"): Promise<MarketCatalog> {
    return this.request<MarketCatalog>(`/v1/markets?environment=${environment}`, { method: "GET" });
  }

  async getSchedules(accountId: string): Promise<DcaSchedule[]> {
    return this.request<DcaSchedule[]>("/v1/schedules", {
      method: "GET",
      headers: await this.authHeaders(accountId),
    });
  }

  async updateSchedule(accountId: string, scheduleId: string, action: "pause" | "resume" | "cancel", schedule?: DcaSchedule): Promise<DcaSchedule> {
    return this.request<DcaSchedule>(`/v1/schedules/${scheduleId}`, {
      method: "PATCH",
      headers: await this.authHeaders(accountId),
      body: JSON.stringify({ action, schedule }),
    });
  }

  async runNow(accountId: string, scheduleId: string): Promise<ExecutionLog> {
    return this.request<ExecutionLog>(`/v1/schedules/${scheduleId}/run-now`, {
      method: "POST",
      headers: await this.authHeaders(accountId),
    });
  }

  async createCheckout(accountId: string, returnUrl: string): Promise<string> {
    const response = await this.request<{ url: string }>("/v1/billing/checkout", {
      method: "POST",
      headers: await this.authHeaders(accountId),
      body: JSON.stringify({ successUrl: returnUrl, cancelUrl: returnUrl }),
    });
    return response.url;
  }

  async createPortal(accountId: string, returnUrl: string): Promise<string> {
    const response = await this.request<{ url: string }>("/v1/billing/portal", {
      method: "POST",
      headers: await this.authHeaders(accountId),
      body: JSON.stringify({ returnUrl }),
    });
    return response.url;
  }

  private async authHeaders(accountId: string): Promise<Record<string, string>> {
    const token = await getCloudAccountToken();
    if (!token) throw new Error("Cloud account token is missing. Reconnect cloud execution.");
    return { "x-hypedca-account": accountId, authorization: `Bearer ${token}` };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => undefined)) as { error?: string } | undefined;
      throw new Error(body?.error ?? `HypeDCA API request failed with ${response.status}.`);
    }

    return response.json() as Promise<T>;
  }
}
