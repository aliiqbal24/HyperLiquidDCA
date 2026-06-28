# HypeDCA Deployment

## Vercel API

Deploy `apps/api` as the Vercel project. Set these environment variables:

- `DATABASE_URL`
- `HYPEDCA_ENCRYPTION_KEY_BASE64`
- `CRON_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_CLOUD_MONTHLY`

Initialize Neon by running `apps/api/db/schema.sql` in the Neon SQL editor before accepting cloud schedules.

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
https://your-api-domain/api/v1/billing/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

If `HYPEDCA_API_URL` is set when running `npm run setup:stripe`, the script also creates the webhook endpoint and prints the signing secret.

## Cron

`apps/api/vercel.json` configures a one-minute cron against `/api/cron/execute`. The route rejects requests unless Vercel sends:

```txt
Authorization: Bearer ${CRON_SECRET}
```
