# Contributing

Thank you for considering a contribution.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## Project rules

- Keep the package focused on generic Telegram Ads reporting access and parsing.
- Do not add customer, billing, dashboard, storage, or sync-run business logic.
- Do not add compatibility aliases or silent fallback inputs. If Telegram Ads
  changes a column, path, or response shape, fail clearly and add a fixture test.
- Document intentional defaults near the feature and cover them with tests.
- Never commit real Telegram Ads cookies, account tokens, or report exports.

## Pull requests

Include tests for any parser, endpoint, or data-contract change. For new
Telegram Ads response shapes, add minimal redacted fixtures that demonstrate the
source format without exposing account data.

