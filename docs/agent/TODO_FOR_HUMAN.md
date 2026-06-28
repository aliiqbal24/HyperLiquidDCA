# Human-Owned Tasks

These are the remaining items that require the project owner rather than a coding agent.

## Accounts and Secrets

- Create Chrome Web Store developer account.
- Choose final domain.
- Create Vercel account/project for `apps/api`.
- Create Neon Postgres database and run `apps/api/db/schema.sql`.
- Rotate any Stripe secret keys that were pasted into chat or logs.
- Run `npm run setup:stripe` with `STRIPE_SECRET_KEY` set. This creates/reuses the HypeDCA Cloud $9/month price and prints `STRIPE_PRICE_CLOUD_MONTHLY`.
- Generate `HYPEDCA_ENCRYPTION_KEY_BASE64` and store it in the hosting secret manager.
- Generate `CRON_SECRET` and store it in Vercel.
- Add Stripe webhook endpoint: `https://your-api-domain/api/v1/billing/webhook`.
- Create Hyperliquid testnet API/agent wallet credentials for integration testing.

## Brand and Legal

- Approve final logo and public app icon.
- Review trademark/disclaimer language.
- Review terms of use and risk disclosure.
- Decide exact public pricing.

## Production Release

- Configure Vercel environment variables from `.env.example`.
- Configure extension build variables for the production API URL.
- If upgrading an existing database, run `apps/api/db/0001_add_execution_log_status.sql`.
- Run Hyperliquid testnet integration tests with real credentials.
- Run `npm run package -w @hypedca/extension`.
- Submit the extension to the Chrome Web Store.
