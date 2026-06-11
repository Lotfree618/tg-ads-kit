# Live Testing

Unit tests use mocked upstream responses and are safe for CI. Live testing uses
a real `ads.telegram.org` session and should be run manually.

## Required Secrets

Create `.env` from the example:

```bash
cp .env.example .env
```

Set:

```txt
TELEGRAM_ADS_COOKIE=stel_adowner=...; stel_ssid=...; stel_token=...
TG_ADS_API_TOKEN=replace-with-a-long-random-token
```

Keep the Telegram Ads cookie private. Do not commit `.env`, cookies, account
tokens, or live command output that includes private account data.

See [Authentication](authentication.md) for how to identify the expected Cookie
header and account token.

## Build Before CLI Smoke Tests

```bash
npm ci
npm run typecheck
npm test
npm run build
```

## CLI Smoke Tests

Use a real Telegram Ads account token from report URLs.

```bash
export TELEGRAM_ADS_ACCOUNT_TOKEN='...'
export TELEGRAM_ADS_AD_ID='187'
```

Reporting checks:

```bash
tg-ads-kit account-daily "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit account-hourly "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit monthly "$TELEGRAM_ADS_ACCOUNT_TOKEN" 202606
tg-ads-kit ad-daily "$TELEGRAM_ADS_ACCOUNT_TOKEN" "$TELEGRAM_ADS_AD_ID" 202606
tg-ads-kit ad-hourly "$TELEGRAM_ADS_ACCOUNT_TOKEN" "$TELEGRAM_ADS_AD_ID"
```

GET-only page snapshot checks:

```bash
tg-ads-kit session-ads
tg-ads-kit account-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit account-budget 0 100
tg-ads-kit account-edit
tg-ads-kit ad-detail "$TELEGRAM_ADS_AD_ID"
tg-ads-kit ad-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN" "$TELEGRAM_ADS_AD_ID"
tg-ads-kit ad-share-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN" "$TELEGRAM_ADS_AD_ID"
tg-ads-kit ad-budget-page "$TELEGRAM_ADS_AD_ID"
tg-ads-kit ad-edit-page "$TELEGRAM_ADS_AD_ID" status
```

These commands only perform GET requests through the client. They do not submit
Telegram Ads forms.

## HTTP Server Smoke Test

```bash
npm start
```

In another shell:

```bash
curl "http://127.0.0.1:3000/health"

curl "http://127.0.0.1:3000/v1/accounts/$TELEGRAM_ADS_ACCOUNT_TOKEN/daily" \
  -H "Authorization: Bearer $TG_ADS_API_TOKEN"
```

## CI Guidance

CI should run:

```bash
npm run typecheck
npm test
npm run build
```

Do not put live Telegram Ads cookies in CI unless the CI environment is
explicitly designed for secret rotation and private live integration tests.
