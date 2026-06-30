import {
  Activity,
  CalendarClock,
  CheckCircle2,
  CirclePause,
  Cloud,
  History,
  KeyRound,
  Pause,
  Play,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  computeInitialNextRun,
  HyperliquidMarketCatalog,
  HYPEDCA_CLOUD_PLAN,
  makeId,
  scheduleSchema,
  searchMarketCatalog,
  type Cadence,
  type DcaSchedule,
  type ExecutorMode,
  type ExecutionLog,
  type HyperliquidCredential,
  type MarginMode,
  type MarketAsset,
  type MarketCatalog,
  type MarketType,
} from "@hypedca/core";
import { HypeDcaApiClient } from "../api.js";
import {
  appendLog,
  getCloudAccountId,
  getCredential,
  getLogs,
  getRecentAssets,
  getSchedules,
  rememberAsset,
  removeSchedule,
  saveCredential,
  updateSchedule,
  upsertSchedule,
} from "../storage.js";

type View = "home" | "onboarding" | "create" | "history" | "settings";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787/api";
const apiClient = new HypeDcaApiClient(apiBaseUrl);

export function App() {
  const [view, setView] = useState<View>("home");
  const [credential, setCredential] = useState<HyperliquidCredential | undefined>();
  const [schedules, setSchedules] = useState<DcaSchedule[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [catalog, setCatalog] = useState<MarketCatalog | undefined>();
  const [marketError, setMarketError] = useState<string | undefined>();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>();

  async function refresh() {
    const [nextCredential, localSchedules, localLogs] = await Promise.all([getCredential(), getSchedules(), getLogs()]);
    setCredential(nextCredential);
    setSchedules(localSchedules);
    setLogs(localLogs);
    if (!nextCredential) setView("onboarding");
    await loadCatalog(nextCredential?.environment ?? "mainnet");
  }

  async function loadCatalog(environment: "mainnet" | "testnet") {
    try {
      const fromApi = await apiClient.getMarketCatalog(environment);
      setCatalog(fromApi);
      setMarketError(undefined);
    } catch {
      try {
        const direct = await new HyperliquidMarketCatalog(environment).getCatalog();
        setCatalog(direct);
        setMarketError(undefined);
      } catch (error) {
        setMarketError(error instanceof Error ? error.message : "Could not load Hyperliquid markets.");
      }
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const nextSchedule = useMemo(
    () =>
      schedules
        .filter((schedule) => schedule.status === "active")
        .sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime())[0],
    [schedules],
  );

  async function handleScheduleAction(schedule: DcaSchedule, action: "pause" | "resume" | "cancel" | "runNow") {
    const accountId = await getCloudAccountId();
    if (schedule.executorMode === "cloud" && accountId && action !== "runNow") {
      const updated = await apiClient.updateSchedule(accountId, schedule.id, action);
      if (action === "cancel") await removeSchedule(schedule.id);
      else await upsertSchedule(updated);
    } else if (schedule.executorMode === "cloud" && accountId && action === "runNow") {
      const log = await apiClient.runNow(accountId, schedule.id);
      await appendLog(log);
    } else if (action === "pause") {
      await updateSchedule(schedule.id, { status: "paused" });
    } else if (action === "resume") {
      await updateSchedule(schedule.id, { status: "active" });
    } else if (action === "cancel") {
      await removeSchedule(schedule.id);
    } else {
      await chrome.runtime.sendMessage({ type: "HYPEDCA_RUN_SCHEDULE", scheduleId: schedule.id }).catch(() => undefined);
    }
    await refresh();
  }

  if (view === "onboarding") {
    return (
      <Shell>
        <Onboarding
          credential={credential}
          onSaved={async () => {
            await refresh();
            setView("create");
          }}
        />
      </Shell>
    );
  }

  if (view === "create") {
    return (
      <Shell>
        <Header onHome={() => setView("home")} onSettings={() => setView("settings")} />
        <ScheduleWizard
          catalog={catalog}
          credential={credential}
          marketError={marketError}
          onSave={async (schedule, selectedAsset) => {
            if (schedule.executorMode === "cloud") {
              if (!credential) throw new Error("Connect a Hyperliquid API wallet before creating a cloud schedule.");
              const accountId = await apiClient.ensureAccount();
              await apiClient.uploadCredential(accountId, credential);
              const cloudSchedule = await apiClient.createCloudSchedule(accountId, { ...schedule, accountId });
              await upsertSchedule(cloudSchedule);
            } else {
              await upsertSchedule(schedule);
            }
            await rememberAsset(selectedAsset.key);
            await refresh();
            setView("home");
          }}
        />
      </Shell>
    );
  }

  if (view === "history") {
    const activeLogs = selectedScheduleId ? logs.filter((log) => log.scheduleId === selectedScheduleId) : logs;
    return (
      <Shell>
        <Header onHome={() => setView("home")} onSettings={() => setView("settings")} />
        <HistoryPanel logs={activeLogs} />
      </Shell>
    );
  }

  if (view === "settings") {
    return (
      <Shell>
        <Header onHome={() => setView("home")} />
        <SettingsPanel credential={credential} onCredentialSaved={refresh} />
      </Shell>
    );
  }

  return (
    <Shell>
      <Header onCreate={() => setView("create")} onSettings={() => setView("settings")} />
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Next recurring order</p>
          <h1>{nextSchedule ? nextSchedule.label : "No active schedules"}</h1>
          <p className="hero-copy">
            {nextSchedule
              ? `${summary(nextSchedule)}. Next run ${formatDate(nextSchedule.nextRunAt)}.`
              : "Create a recurring Hyperliquid order with live asset, leverage, and execution constraints."}
          </p>
        </div>
        <button className="primary" type="button" onClick={() => setView("create")}>
          <Plus size={18} />
          Create order
        </button>
      </section>

      <section className="mode-grid">
        <ModeCard icon={<Zap size={18} />} title="Browser" copy="Free recurring execution while this browser/device is available." />
        <ModeCard icon={<Cloud size={18} />} title="Cloud" copy="Paid 24/7 execution through HypeDCA cloud." />
      </section>

      <section className="panel">
        <div className="section-title">
          <CalendarClock size={18} />
          <h2>Recurring orders</h2>
        </div>
        <div className="schedule-list">
          {schedules.length === 0 ? (
            <EmptyState onCreate={() => setView("create")} />
          ) : (
            schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                onAction={(action) => void handleScheduleAction(schedule, action)}
                onHistory={() => {
                  setSelectedScheduleId(schedule.id);
                  setView("history");
                }}
              />
            ))
          )}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="app-shell">{children}</main>;
}

function Header({ onCreate, onHome, onSettings }: { onCreate?: () => void; onHome?: () => void; onSettings?: () => void }) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={onHome}>
        <span className="brand-mark">H</span>
        <span>
          <strong>HypeDCA</strong>
          <small>Independent for Hyperliquid</small>
        </span>
      </button>
      <div className="header-actions">
        {onSettings ? (
          <button className="icon-button" type="button" onClick={onSettings} title="Settings">
            <KeyRound size={18} />
          </button>
        ) : null}
        {onCreate ? (
          <button className="icon-button" type="button" onClick={onCreate} title="Create order">
            <Plus size={19} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

function Onboarding({ credential, onSaved }: { credential: HyperliquidCredential | undefined; onSaved: () => Promise<void> }) {
  const [accountAddress, setAccountAddress] = useState(credential?.accountAddress ?? "");
  const [privateKey, setPrivateKey] = useState(credential?.privateKey ?? "");
  const [environment, setEnvironment] = useState<"mainnet" | "testnet">(credential?.environment ?? "mainnet");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);
    try {
      await saveCredential({ accountAddress: accountAddress as `0x${string}`, privateKey: privateKey as `0x${string}`, environment });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this API wallet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="onboarding">
      <div className="brand-lockup">
        <span className="brand-mark large">H</span>
        <div>
          <p className="eyebrow">HypeDCA</p>
          <h1>Recurring Hyperliquid orders, set once.</h1>
        </div>
      </div>
      <div className="principles">
        <Feature icon={<ShieldCheck size={18} />} title="No master keys" copy="Use a Hyperliquid API wallet only. Never paste a seed phrase." />
        <Feature icon={<Zap size={18} />} title="Free browser mode" copy="Runs while your browser/device can execute alarms." />
        <Feature icon={<Cloud size={18} />} title="Cloud upgrade" copy="Paid schedules can run when your computer is off." />
      </div>
      <form className="panel form" onSubmit={submit}>
        <div className="section-title">
          <KeyRound size={18} />
          <h2>Connect API wallet</h2>
        </div>
        <label>
          Account address
          <input value={accountAddress} onChange={(event) => setAccountAddress(event.target.value)} placeholder="0x..." required />
        </label>
        <label>
          API wallet private key
          <input value={privateKey} onChange={(event) => setPrivateKey(event.target.value)} placeholder="0x..." type="password" required />
        </label>
        <div className="segmented">
          <button className={environment === "mainnet" ? "selected" : ""} type="button" onClick={() => setEnvironment("mainnet")}>
            Mainnet
          </button>
          <button className={environment === "testnet" ? "selected" : ""} type="button" onClick={() => setEnvironment("testnet")}>
            Testnet
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="primary full" type="submit" disabled={saving}>
          <CheckCircle2 size={18} />
          {saving ? "Saving..." : "Continue"}
        </button>
        <p className="fine-print">HypeDCA is independent and is not affiliated with or endorsed by Hyperliquid.</p>
      </form>
    </section>
  );
}

function ScheduleWizard({
  catalog,
  credential,
  marketError,
  onSave,
}: {
  catalog: MarketCatalog | undefined;
  credential: HyperliquidCredential | undefined;
  marketError: string | undefined;
  onSave: (schedule: DcaSchedule, selectedAsset: MarketAsset) => Promise<void>;
}) {
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | undefined>();
  const [side, setSide] = useState("buy");
  const [notionalUsd, setNotionalUsd] = useState(50);
  const [cadence, setCadence] = useState("weekly");
  const [time, setTime] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState(5);
  const [leverage, setLeverage] = useState(2);
  const [marginMode, setMarginMode] = useState<MarginMode>("isolated");
  const [maxSlippageBps, setMaxSlippageBps] = useState(100);
  const [executorMode, setExecutorMode] = useState<ExecutorMode>("browser");
  const [maxRuns, setMaxRuns] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedAsset && catalog?.assets[0]) {
      setSelectedAsset(catalog.assets[0]);
    }
  }, [catalog, selectedAsset]);

  useEffect(() => {
    if (!selectedAsset) return;
    setSide(selectedAsset.marketType === "spot" ? "buy" : "long");
    setLeverage(Math.min(2, selectedAsset.maxLeverage ?? 2));
    setMarginMode(selectedAsset.marginModes[0] ?? "isolated");
  }, [selectedAsset]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      if (!credential) throw new Error("Connect a Hyperliquid API wallet before creating a recurring order.");
      if (!selectedAsset) throw new Error("Choose a Hyperliquid market.");
      if (selectedAsset.isDelisted) throw new Error("This market is delisted and cannot be scheduled.");
      if (selectedAsset.marketType === "perp" && selectedAsset.maxLeverage && leverage > selectedAsset.maxLeverage) {
        throw new Error(`Maximum leverage for ${selectedAsset.displayName} is ${selectedAsset.maxLeverage}x.`);
      }

      const now = new Date().toISOString();
      const scheduleCadence: Cadence =
        cadence === "daily"
          ? { kind: "daily", time }
          : cadence === "monthly"
            ? { kind: "monthly", dayOfMonth: 1, time }
            : { kind: "weekly", daysOfWeek: [dayOfWeek], time };

      const schedule: DcaSchedule = {
        id: makeId("sch"),
        accountId: "local",
        label: `${selectedAsset.displayName} ${selectedAsset.marketType === "spot" ? side : side.toUpperCase()}`,
        marketType: selectedAsset.marketType,
        asset: selectedAsset.symbol,
        assetId: selectedAsset.assetId,
        assetDisplayName: selectedAsset.displayName,
        side: side as DcaSchedule["side"],
        notionalUsd,
        cadence: scheduleCadence,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        startAt: now,
        nextRunAt: computeInitialNextRun(scheduleCadence, Intl.DateTimeFormat().resolvedOptions().timeZone, now),
        runCount: 0,
        status: "active",
        executorMode,
        ...(selectedAsset.marketType === "perp"
          ? { leverage, marginMode, maxLeverageAtCreation: selectedAsset.maxLeverage ?? leverage }
          : {}),
        risk: { maxSlippageBps, ...(maxRuns ? { maxRuns } : {}) },
        createdAt: now,
        updatedAt: now,
      };

      scheduleSchema.parse(schedule);
      await onSave(schedule, selectedAsset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create this recurring order.");
    } finally {
      setSaving(false);
    }
  }

  const maxLeverage = selectedAsset?.maxLeverage ?? 1;
  const marginModes = selectedAsset?.marginModes ?? [];

  return (
    <form className="wizard" onSubmit={submit}>
      <section className="panel form">
        <div className="section-title">
          <Sparkles size={18} />
          <h2>Create recurring order</h2>
        </div>
        <AssetPicker catalog={catalog} selectedAsset={selectedAsset} error={marketError} onSelect={setSelectedAsset} />
        <label>
          Action
          <select value={side} onChange={(event) => setSide(event.target.value)}>
            {selectedAsset?.marketType === "perp" ? (
              <>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </>
            ) : (
              <>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </>
            )}
          </select>
        </label>
        <label>
          Amount per run, USD
          <input min="1" step="1" type="number" value={notionalUsd} onChange={(event) => setNotionalUsd(Number(event.target.value))} />
        </label>
        {selectedAsset?.marketType === "perp" ? (
          <div className="inline-grid">
            <label>
              Leverage
              <input min="1" max={maxLeverage} step="1" type="number" value={leverage} onChange={(event) => setLeverage(Number(event.target.value))} />
            </label>
            <label>
              Margin
              <select value={marginMode} onChange={(event) => setMarginMode(event.target.value as MarginMode)}>
                {marginModes.map((mode) => (
                  <option value={mode} key={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </section>

      <section className="panel form">
        <div className="section-title">
          <CalendarClock size={18} />
          <h2>Timing and safety</h2>
        </div>
        <label>
          Cadence
          <select value={cadence} onChange={(event) => setCadence(event.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        {cadence === "weekly" ? (
          <label>
            Day
            <select value={dayOfWeek} onChange={(event) => setDayOfWeek(Number(event.target.value))}>
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
              <option value={7}>Sunday</option>
            </select>
          </label>
        ) : null}
        <div className="inline-grid">
          <label>
            Time
            <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
          </label>
          <label>
            Max runs
            <input min="1" type="number" value={maxRuns ?? ""} onChange={(event) => setMaxRuns(event.target.value ? Number(event.target.value) : undefined)} placeholder="No limit" />
          </label>
        </div>
        <label>
          Max slippage, bps
          <input min="1" max="300" step="1" type="number" value={maxSlippageBps} onChange={(event) => setMaxSlippageBps(Number(event.target.value))} />
        </label>
        <div className="mode-picker">
          <button className={executorMode === "browser" ? "selected" : ""} type="button" onClick={() => setExecutorMode("browser")}>
            <Zap size={18} />
            <span>Browser</span>
            <small>Free, device dependent</small>
          </button>
          <button className={executorMode === "cloud" ? "selected" : ""} type="button" onClick={() => setExecutorMode("cloud")}>
            <Cloud size={18} />
            <span>Cloud</span>
            <small>Paid, 24/7</small>
          </button>
        </div>
        <ReviewSummary
          asset={selectedAsset}
          side={side}
          amount={notionalUsd}
          cadence={cadence}
          time={time}
          {...(selectedAsset?.marketType === "perp" ? { leverage } : {})}
        />
        {error ? <p className="error">{error}</p> : null}
        <button className="primary full" type="submit" disabled={saving || !selectedAsset}>
          <CheckCircle2 size={18} />
          {saving ? "Activating..." : "Activate recurring order"}
        </button>
      </section>
    </form>
  );
}

function AssetPicker({
  catalog,
  selectedAsset,
  error,
  onSelect,
}: {
  catalog: MarketCatalog | undefined;
  selectedAsset: MarketAsset | undefined;
  error: string | undefined;
  onSelect: (asset: MarketAsset) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MarketType | "all">("all");
  const [recentAssets, setRecentAssets] = useState<string[]>([]);

  useEffect(() => {
    void getRecentAssets().then(setRecentAssets);
  }, []);

  const results = useMemo(() => {
    if (!catalog) return [];
    const searched = searchMarketCatalog(catalog, query, filter, 45);
    if (query.trim()) return searched;
    const recent = recentAssets.flatMap((key) => catalog.assets.find((asset) => asset.key === key) ?? []);
    return [...recent, ...searched.filter((asset) => !recent.some((item) => item.key === asset.key))].slice(0, 45);
  }, [catalog, filter, query, recentAssets]);

  return (
    <div className="asset-picker">
      <label>
        Market
        <div className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search BTC, ETH, HYPE/USDC..." />
        </div>
      </label>
      <div className="segmented three">
        <button className={filter === "all" ? "selected" : ""} type="button" onClick={() => setFilter("all")}>
          All
        </button>
        <button className={filter === "perp" ? "selected" : ""} type="button" onClick={() => setFilter("perp")}>
          Perps
        </button>
        <button className={filter === "spot" ? "selected" : ""} type="button" onClick={() => setFilter("spot")}>
          Spot
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="asset-results">
        {results.map((asset) => (
          <button className={selectedAsset?.key === asset.key ? "asset-row selected" : "asset-row"} type="button" key={asset.key} onClick={() => onSelect(asset)} disabled={asset.isDelisted}>
            <span>
              <strong>{asset.displayName}</strong>
              <small>{asset.marketType === "perp" ? `Perp · max ${asset.maxLeverage ?? 1}x` : "Spot"}</small>
            </span>
            <span className="asset-metrics">
              <strong>{asset.midPrice ? `$${compact(asset.midPrice)}` : "Market"}</strong>
              <small>{asset.dayNotionalVolume ? `$${compact(asset.dayNotionalVolume)} vol` : ""}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleCard({
  schedule,
  onAction,
  onHistory,
}: {
  schedule: DcaSchedule;
  onAction: (action: "pause" | "resume" | "cancel" | "runNow") => void;
  onHistory: () => void;
}) {
  return (
    <article className="schedule-card">
      <div className="card-head">
        <div>
          <h3>{schedule.label}</h3>
          <p>{summary(schedule)}</p>
        </div>
        <span className={`status ${schedule.status}`}>
          {schedule.status === "active" ? <CheckCircle2 size={14} /> : <CirclePause size={14} />}
          {schedule.status}
        </span>
      </div>
      <div className="facts">
        <span>Next {formatDate(schedule.nextRunAt)}</span>
        <span>{schedule.executorMode === "cloud" ? "Cloud 24/7" : "Browser"}</span>
        {schedule.marketType === "perp" ? <span>{schedule.leverage}x {schedule.marginMode}</span> : null}
      </div>
      <div className="card-actions">
        <button className="text-button" type="button" onClick={onHistory}>
          <History size={15} />
          History
        </button>
        <button className="text-button" type="button" onClick={() => onAction("runNow")}>
          <RotateCw size={15} />
          Run now
        </button>
        <button className="text-button" type="button" onClick={() => onAction(schedule.status === "active" ? "pause" : "resume")}>
          {schedule.status === "active" ? <Pause size={15} /> : <Play size={15} />}
          {schedule.status === "active" ? "Pause" : "Resume"}
        </button>
        <button className="text-button danger" type="button" onClick={() => onAction("cancel")}>
          <Trash2 size={15} />
          Cancel
        </button>
      </div>
    </article>
  );
}

function HistoryPanel({ logs }: { logs: ExecutionLog[] }) {
  return (
    <section className="panel">
      <div className="section-title">
        <Activity size={18} />
        <h2>Execution history</h2>
      </div>
      <div className="timeline">
        {logs.length === 0 ? (
          <p className="muted">No runs yet. The first execution result will appear here.</p>
        ) : (
          logs.map((log) => (
            <article className="timeline-item" key={log.id}>
              <span className={`dot dot-${log.status}`} />
              <div>
                <strong>{statusLabel(log.status)}</strong>
                <p>{log.message}</p>
                <div className="facts">
                  {log.orderId ? <span>OID {log.orderId}</span> : null}
                  {log.cloid ? <span>{log.cloid.slice(0, 10)}...</span> : null}
                  {log.averagePrice ? <span>Avg ${log.averagePrice}</span> : null}
                </div>
                <time>{formatDate(log.createdAt)}</time>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function SettingsPanel({ credential, onCredentialSaved }: { credential: HyperliquidCredential | undefined; onCredentialSaved: () => Promise<void> }) {
  async function openCheckout() {
    const accountId = await apiClient.ensureAccount();
    const url = await apiClient.createCheckout(accountId, globalThis.location.href);
    globalThis.open(url, "_blank", "noopener,noreferrer");
  }

  async function openPortal() {
    const accountId = await apiClient.ensureAccount();
    const url = await apiClient.createPortal(accountId, globalThis.location.href);
    globalThis.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="settings-stack">
      <CredentialSettings credential={credential} onSaved={onCredentialSaved} />
      <section className="panel form">
        <div className="section-title">
          <Cloud size={18} />
          <h2>Cloud execution</h2>
        </div>
        <p className="notice">
          Cloud schedules run from HypeDCA infrastructure on the hosted execution schedule. {HYPEDCA_CLOUD_PLAN.name} is ${HYPEDCA_CLOUD_PLAN.monthlyUsd}/month and includes up to{" "}
          {HYPEDCA_CLOUD_PLAN.dailyCloudPurchases} cloud purchases per day.
        </p>
        <button className="primary full" type="button" onClick={() => void openCheckout()}>
          Activate Cloud - ${HYPEDCA_CLOUD_PLAN.monthlyUsd}/mo
        </button>
        <button className="secondary full" type="button" onClick={() => void openPortal()}>
          Manage billing
        </button>
        <p className="fine-print">Stripe Checkout opens in a new tab. Billing can be canceled or updated from the customer portal.</p>
      </section>
    </div>
  );
}

function CredentialSettings({ credential, onSaved }: { credential: HyperliquidCredential | undefined; onSaved: () => Promise<void> }) {
  const [accountAddress, setAccountAddress] = useState(credential?.accountAddress ?? "");
  const [privateKey, setPrivateKey] = useState(credential?.privateKey ?? "");
  const [environment, setEnvironment] = useState<"mainnet" | "testnet">(credential?.environment ?? "mainnet");
  const [status, setStatus] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAccountAddress(credential?.accountAddress ?? "");
    setPrivateKey(credential?.privateKey ?? "");
    setEnvironment(credential?.environment ?? "mainnet");
  }, [credential]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(undefined);
    setError(undefined);
    setSaving(true);
    try {
      await saveCredential({ accountAddress: accountAddress as `0x${string}`, privateKey: privateKey as `0x${string}`, environment });
      await onSaved();
      setStatus("API wallet settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save API wallet settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel form" onSubmit={submit}>
      <div className="section-title">
        <KeyRound size={18} />
        <h2>API wallet</h2>
      </div>
      <label>
        Account address
        <input value={accountAddress} onChange={(event) => setAccountAddress(event.target.value)} placeholder="0x..." required />
      </label>
      <label>
        API wallet private key
        <input value={privateKey} onChange={(event) => setPrivateKey(event.target.value)} placeholder="0x..." type="password" required />
      </label>
      <div className="segmented">
        <button className={environment === "mainnet" ? "selected" : ""} type="button" onClick={() => setEnvironment("mainnet")}>
          Mainnet
        </button>
        <button className={environment === "testnet" ? "selected" : ""} type="button" onClick={() => setEnvironment("testnet")}>
          Testnet
        </button>
      </div>
      {status ? <p className="success">{status}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <button className="primary full" type="submit" disabled={saving}>
        <CheckCircle2 size={18} />
        {saving ? "Saving..." : "Save API wallet"}
      </button>
      <p className="fine-print">Use your Hyperliquid account address and the private key for a limited API or agent wallet. Never enter a seed phrase or master private key.</p>
    </form>
  );
}

function ReviewSummary({
  asset,
  side,
  amount,
  cadence,
  time,
  leverage,
}: {
  asset: MarketAsset | undefined;
  side: string;
  amount: number;
  cadence: string;
  time: string;
  leverage?: number;
}) {
  if (!asset) return null;
  return (
    <div className="review">
      <strong>
        {asset.marketType === "perp" ? `${side} ${leverage}x` : side} ${asset.displayName}
      </strong>
      <p>
        ${amount.toLocaleString()} every {cadence} at {time}. Max slippage is set before every IOC order.
      </p>
    </div>
  );
}

function ModeCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <article className="mode-card">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </article>
  );
}

function Feature({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <article className="feature">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </article>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <CalendarClock size={24} />
      </div>
      <h3>Create your first recurring order</h3>
      <p>Search Hyperliquid markets, choose timing, confirm safety settings, then let HypeDCA handle the repetition.</p>
      <button className="secondary" type="button" onClick={onCreate}>
        <Plus size={17} />
        Create order
      </button>
    </div>
  );
}

function summary(schedule: DcaSchedule): string {
  const action = schedule.marketType === "perp" ? `${schedule.side} ${schedule.leverage}x` : schedule.side;
  return `${action} $${schedule.notionalUsd.toLocaleString()} of ${schedule.assetDisplayName ?? schedule.asset}`;
}

function statusLabel(status: ExecutionLog["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function compact(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 2 }).format(number);
}
