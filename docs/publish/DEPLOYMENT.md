# HypeDCA Deployment

## Vercel API

Deploy from the repository root as the Vercel project. The project settings should be:

- Framework: Next.js
- Build command: `npm run build -w @hypedca/api`
- Install command: `npm install`
- Output directory: `apps/api/.next`

Current production project:

- Vercel project: `hypedca-api`
- Production URL: `https://hypedca-api.vercel.app`
- Neon project: `hypedca` / `withered-wave-39313525`

For the Vercel Hobby/free plan, keep `vercel.json` as-is; it runs the cloud executor once per day at 00:00 UTC. Vercel Hobby cron jobs cannot run every minute.

When you upgrade to Vercel Pro, replace `vercel.json` with `vercel.pro.json` before deploying to enable minute-level cloud execution.

Set these environment variables:

- `DATABASE_URL` - already set in Vercel production
- `HYPEDCA_ENCRYPTION_KEY_BASE64` - already set in Vercel production
- `CRON_SECRET` - already set in Vercel production
- `STRIPE_SECRET_KEY` - owner must set after rotating any exposed key
- `STRIPE_WEBHOOK_SECRET` - owner must set after creating the webhook endpoint
- `STRIPE_PRICE_CLOUD_MONTHLY` - owner must set from `npm run setup:stripe`

Initialize Neon by running:

```bash
npm run setup:db
```

The script reads `DATABASE_URL` from your shell, `.env.local`, or `.env.production.local`, then applies `apps/api/db/schema.sql` and `apps/api/db/0001_add_execution_log_status.sql`.

## Local Bootstrap

Generate app secrets:

```bash
npm run setup:secrets
```

Create `.env.production.local` from `.env.example`, fill the real values, then verify it:

```bash
npm run check:vercel-env
```

After `vercel link` has connected the repo root to the Vercel project, push env vars:

```bash
npm run push:vercel-env -- .env.production.local production
```

Build and deploy the API:

```bash
npm run vercel:build:api
npm run vercel:deploy:api
```

## Stripe

Create the recurring subscription product and price:

```bash
npm run setup:stripe
```

With `STRIPE_SECRET_KEY` set, the script creates or reuses:

- Product: `HypeDCA Cloud`
- Price: `$9/month`
- Lookup key: `hypedca_cloud_monthly_9_usd`
- Included quota: `20` cloud purchases per day

Set the webhook endpoint to:

```txt
https://hypedca-api.vercel.app/api/v1/billing/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

If `HYPEDCA_API_URL` is set when running `npm run setup:stripe`, the script also creates the webhook endpoint and prints the signing secret.

## Cron

`vercel.json` configures a daily cron against `/api/cron/execute` for Vercel Hobby compatibility. The route rejects requests unless Vercel sends:

```txt
Authorization: Bearer ${CRON_SECRET}
```

For minute-level execution on Vercel Pro, deploy with `vercel.pro.json`.

## GitHub Actions

`.github/workflows/vercel-api.yml` deploys `apps/api` on pushes to `main`. Add these GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The IDs are available after linking the Vercel project in `apps/api/.vercel/project.json`.
