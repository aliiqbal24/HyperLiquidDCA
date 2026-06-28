# Human-Owned Tasks

These are the remaining items that require the project owner rather than a coding agent.

## Accounts and Secrets

- Create Chrome Web Store developer account.
- Choose final domain.
- Keep the linked Vercel project `hypedca-api` configured to deploy from the repo root with build command `npm run build -w @hypedca/api` and output directory `apps/api/.next`. Current production API: `https://hypedca-api.vercel.app`.
- Keep the Neon project `hypedca` / `withered-wave-39313525` active. Its `neondb` database has the current schema applied.
- Rotate any Vercel, Neon, or Stripe keys that were pasted into chat or logs.
- Run `npm run setup:stripe` with `STRIPE_SECRET_KEY` set. This creates/reuses the HypeDCA Cloud $9/month price and prints `STRIPE_PRICE_CLOUD_MONTHLY`.
- Store the Stripe env vars in Vercel production: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_CLOUD_MONTHLY`.
- On Vercel Hobby, accept daily cloud execution. Upgrade to Vercel Pro and deploy root `vercel.pro.json` when minute-level cloud execution is required.
- Add Stripe webhook endpoint: `https://hypedca-api.vercel.app/api/v1/billing/webhook`.
- Create Hyperliquid testnet API/agent wallet credentials for integration testing.

## Brand and Legal

- Approve final logo and public app icon.
- Review trademark/disclaimer language.
- Review terms of use and risk disclosure.
- Decide exact public pricing.

## Production Release

- Vercel production already has `DATABASE_URL`, `HYPEDCA_ENCRYPTION_KEY_BASE64`, and `CRON_SECRET` configured as encrypted values.
- Add GitHub repository secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` if using the included GitHub Actions deployment.
- Configure extension build variables for the production API URL.
- Run Hyperliquid testnet integration tests with real credentials.
- Run `npm run package -w @hypedca/extension`.
- Submit the extension to the Chrome Web Store.
