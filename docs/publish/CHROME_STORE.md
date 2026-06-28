# Chrome Web Store Release

## Build

```bash
npm run package -w @hypedca/extension
```

The uploadable ZIP is written to:

```txt
release/hypedca-extension.zip
```

By default the packaging script removes `http://localhost:8787/*` from extension host permissions. Set `HYPEDCA_INCLUDE_LOCALHOST=true` only for local test packages.

## Store Listing Notes

Use clear independent-brand language:

- HypeDCA is independent and is not affiliated with or endorsed by Hyperliquid.
- Users should create limited API/agent wallet credentials and never enter seed phrases or master wallet keys.
- Browser mode runs only while the browser/device can process extension alarms.
- Cloud mode requires a paid $9/month subscription and includes up to 20 cloud-executed purchases per day because HypeDCA signs scheduled orders from server infrastructure.
