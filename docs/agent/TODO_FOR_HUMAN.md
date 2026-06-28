# Human-Owned Tasks

These are the remaining items that require the project owner rather than a coding agent.

## Accounts and Secrets

- Create Chrome Web Store developer account.
- Choose final domain.
- Create Vercel account/project for `apps/api`.
- Create Neon Postgres database and run `apps/api/db/schema.sql`.
- Create Stripe products/prices for Cloud Lite and Cloud Pro.
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
- Configure extension build variables for the production API URL and Stripe price IDs.
- Run Hyperliquid testnet integration tests with real credentials.
- Run `npm run package -w @hypedca/extension`.
- Submit the extension to the Chrome Web Store.
