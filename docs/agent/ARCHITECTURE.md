# Architecture

## Repo Layout

- `apps/extension`: Chrome/Brave/Edge Manifest V3 extension. This is the primary user interface and the free browser executor.
- `apps/api`: Next.js/Vercel cloud API for accounts, encrypted credentials, cloud schedules, billing checkout, audit logs, and cron execution.
- `apps/worker`: Legacy run-once worker retained for local experimentation. Production cloud execution is handled by the Vercel Cron route in `apps/api`.
- `packages/core`: Shared schedule engine, validation, Hyperliquid adapter, order planning, and types.

## Execution Modes

### Browser Mode

Browser mode is free and runs inside the extension service worker using Chrome alarms.

Rules:

- Executes only while the browser/device can run extension events.
- If a run is missed because the browser/device is unavailable, only the next due occurrence is considered. Do not bulk catch up.
- Store local schedules, logs, and API credentials in `chrome.storage.local`.
- Use the same `packages/core` order planning as cloud mode.

### Cloud Mode

Cloud mode is paid and runs only through the Vercel API cron route.

Rules:

- Paid cloud schedules must not also execute in the browser.
- Use `scheduleId + scheduledFor` as the occurrence lock.
- Store Hyperliquid API/agent credentials encrypted at rest.
- Pause schedules when billing is inactive.
- Enforce HypeDCA Cloud's quota: $9/month, maximum 20 cloud-executed purchases per account per UTC day.
- Fail and log schedules when credentials are missing or execution has a hard error.

## Production Cloud Stack

- Hosting: Vercel, because it gives the smallest owner-operated surface for Next.js routes, secrets, and Cron.
- Database: Neon Postgres through Vercel Marketplace or direct Neon. Initialize it with `apps/api/db/schema.sql`.
- Billing: Stripe Billing through Checkout Sessions, Customer Portal, and webhooks. The single plan is `HypeDCA Cloud`, `$9/month`, lookup key `hypedca_cloud_monthly_9_usd`.
- Scheduling: Vercel Cron calls `GET /api/cron/execute` every minute with `Authorization: Bearer ${CRON_SECRET}`.

## Hyperliquid

Use `@nktkas/hyperliquid` behind the adapter in `packages/core/src/hyperliquid.ts`.

Market-like execution is represented as aggressive IOC limit orders:

- Buy/long limit = mid price plus max slippage.
- Sell/short limit = mid price minus max slippage.
- Size = notional USD divided by mid price, formatted with Hyperliquid `szDecimals`.

Perp schedules default to isolated margin unless an explicit future UI change says otherwise.
