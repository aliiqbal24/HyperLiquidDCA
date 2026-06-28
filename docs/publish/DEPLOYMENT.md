# HypeDCA Deployment

## Vercel API

Deploy `apps/api` as the Vercel project. Set these environment variables:

- `DATABASE_URL`
- `HYPEDCA_ENCRYPTION_KEY_BASE64`
- `CRON_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_CLOUD_LITE`
- `STRIPE_PRICE_CLOUD_PRO`

Initialize Neon by running `apps/api/db/schema.sql` in the Neon SQL editor before accepting cloud schedules.

## Stripe

Create two recurring subscription prices:

- Cloud Lite
- Cloud Pro

Set the webhook endpoint to:

```txt
https://your-api-domain/api/v1/billing/webhook
```

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Cron

`apps/api/vercel.json` configures a one-minute cron against `/api/cron/execute`. The route rejects requests unless Vercel sends:

```txt
Authorization: Bearer ${CRON_SECRET}
```
