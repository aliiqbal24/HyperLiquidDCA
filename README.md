# HypeDCA

HypeDCA is an independent recurring trade automation tool for Hyperliquid.

The v1 product is extension-first:

- Free schedules execute in the browser while the browser/device is available.
- Paid schedules execute from cloud infrastructure so they can run 24/7. The first plan is HypeDCA Cloud at $9/month for up to 20 cloud purchases per day.
- Users provide Hyperliquid API/agent wallet credentials only. HypeDCA must never request a master wallet seed phrase or private key.

See `docs/agent/` before making product or architecture changes.

## What is implemented

- Chrome/Chromium MV3 extension UI for creating, pausing, resuming, canceling, running, and reviewing recurring orders.
- Hyperliquid-like searchable market picker using live Hyperliquid metadata where available.
- Browser execution with Chrome alarms for the free mode.
- Vercel/Next cloud API with Neon Postgres storage, encrypted API-wallet credentials, cron execution, Stripe Checkout, Stripe Customer Portal, billing webhooks, and daily cloud purchase quota enforcement.
- Chrome Web Store packaging script that builds a ZIP and strips localhost permissions by default.

## Development

```bash
npm install
npm run build
npm test
```

Run the extension UI:

```bash
npm run dev:extension
```

Run the API:

```bash
npm run dev:api
```

Run the legacy worker once:

```bash
npm run dev:worker
```

The production cloud executor is `apps/api/app/api/cron/execute/route.ts`, triggered by Vercel Cron.

## Deployment

1. Create a Neon Postgres database and run `apps/api/db/schema.sql`.
2. Run `npm run setup:stripe` with `STRIPE_SECRET_KEY` set to create the $9/month HypeDCA Cloud product and price.
3. Set the API environment variables from `.env.example` in Vercel.
4. Deploy `apps/api` as the Vercel project.
5. Set `VITE_API_BASE_URL` for the extension build.
6. Run `npm run package -w @hypedca/extension` and upload `release/hypedca-extension.zip` to the Chrome Web Store.
