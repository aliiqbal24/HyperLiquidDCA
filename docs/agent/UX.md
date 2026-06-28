# UX Notes

## First Run

1. User opens HypeDCA.
2. HypeDCA explains three ideas: no master keys, browser mode, cloud mode.
3. User imports a Hyperliquid API/agent wallet credential.
4. User creates the first schedule through a guided composer.

## Main Screen

The home screen should prioritize:

- Next scheduled trade.
- Active automation cards.
- Clear executor mode: browser or cloud.
- Last/next run visibility.

Avoid tables as the primary UI. Cards and timelines are better for a small extension surface.

## Schedule Composer

The composer should feel like:

> Buy $50 of BTC every Friday at 9:00 AM.

Required choices:

- Spot or perps.
- Asset.
- Direction.
- USD amount per run.
- Cadence and time.
- Slippage.
- Browser or cloud execution.
- Perps: leverage and margin mode.

## Copy Tone

Use direct, calm copy. Do not over-explain. Do not market aggressively.

Example:

- Browser mode: `Runs while this browser/device is awake and online.`
- Cloud mode: `Runs 24/7 from HypeDCA cloud.`
- Disclaimer: `HypeDCA is independent and is not affiliated with or endorsed by Hyperliquid.`

## Visual Direction

- Dark interface.
- Mint accent.
- Soft, precise Apple-like surfaces.
- 8-22px radii depending on element scale.
- No decorative blobs/orbs.
- Dense enough for a trading tool, but not cramped.
