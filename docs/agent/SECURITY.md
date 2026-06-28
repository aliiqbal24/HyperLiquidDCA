# Security Model

## Credential Policy

HypeDCA must never ask for:

- Seed phrases.
- Master wallet private keys.
- Withdrawal credentials.

HypeDCA may ask for:

- Hyperliquid API/agent wallet private key.
- Master account address needed to identify the Hyperliquid account.

## Browser Mode

Browser mode stores credentials in `chrome.storage.local`. This is acceptable for a power-user MVP but should be called out plainly in the UI and store listing. Passphrase wrapping is a recommended hardening item before a broad public launch.

## Cloud Mode

Cloud mode requires server-side signing capability. That means the cloud must be able to decrypt a Hyperliquid API/agent key at execution time.

Required controls before production:

- Encrypt credentials at rest.
- Keep encryption keys outside the database.
- Restrict API access by authenticated account.
- Log every execution.
- Never expose private keys in logs or API responses.
- Provide clear user instructions for revoking API/agent keys in Hyperliquid.
- Add operational alerting for worker failures.

## Duplicate Prevention

Use deterministic occurrence locks:

```txt
scheduleId:scheduledFor
```

Cloud schedules should execute in the cloud only. Do not build browser-first/cloud-fallback in v1 because it materially increases duplicate-order risk.
