# tg-ads-kit

Unofficial Telegram Ads reporting API service, client, and parser toolkit for
Node.js and TypeScript.

This project reads the CSV, TSV, and account HTML surfaces exposed by
`https://ads.telegram.org`, normalizes them into typed JavaScript objects, and
can run as a standalone HTTP API service. It is not an official Telegram
project and does not implement ad mutation or campaign management.

## Install

```bash
npm install tg-ads-kit
```

For a standalone checkout:

```bash
git clone https://github.com/Lotfree618/tg-ads-kit.git tg-ads-kit
cd tg-ads-kit
npm ci
cp .env.example .env
```

The server and CLI load `.env` automatically.

## Requirements

- Node.js 20 or newer.
- A valid `ads.telegram.org` browser Cookie header.
- A Telegram Ads account token from the account report URLs.
- A local API bearer token when running the HTTP service.

## Standalone API Server

Set environment variables:

```bash
export TELEGRAM_ADS_COOKIE='stel_adowner=...; stel_ssid=...; stel_token=...'
export TG_ADS_API_TOKEN='replace-with-a-long-random-token'
```

Run in development:

```bash
npm run dev
```

Build and run the compiled server:

```bash
npm run build
npm start
```

Call the API:

```bash
curl "http://127.0.0.1:3000/v1/accounts/$TELEGRAM_ADS_ACCOUNT_TOKEN/daily" \
  -H "Authorization: Bearer $TG_ADS_API_TOKEN"
```

Main routes:

- `GET /health`
- `GET /v1/accounts/:accountToken/daily`
- `GET /v1/accounts/:accountToken/hourly`
- `GET /v1/accounts/:accountToken/stats-page`
- `GET /v1/accounts/:accountToken/monthly?month=YYYYMM`
- `GET /v1/session/ads`
- `GET /v1/session/account/budget?offset=0&limit=100`
- `GET /v1/session/account/edit`
- `GET /v1/accounts/:accountToken/ads/:adId/detail`
- `GET /v1/accounts/:accountToken/ads/:adId/stats-page`
- `GET /v1/accounts/:accountToken/ads/:adId/share-stats-page`
- `GET /v1/accounts/:accountToken/ads/:adId/budget-page`
- `GET /v1/accounts/:accountToken/ads/:adId/edit/:section`
- `GET /v1/accounts/:accountToken/ads/:adId/daily?month=YYYYMM`
- `GET /v1/accounts/:accountToken/ads/:adId/hourly`
- `GET /v1/accounts/:accountToken/snapshot?month=YYYYMM`

See [docs/api.md](docs/api.md) for the API contract.

## Documentation

- [HTTP API](docs/api.md)
- [Authentication](docs/authentication.md)
- [TypeScript Client](docs/client.md)
- [Data Models](docs/data-models.md)
- [Live Testing](docs/live-testing.md)

## CLI

After `npm run build`, the CLI is available at `dist/cli.js`; when installed as
a package it is exposed as `tg-ads-kit`.

```bash
tg-ads-kit account-daily "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit account-hourly "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit monthly "$TELEGRAM_ADS_ACCOUNT_TOKEN" 202606
tg-ads-kit session-ads
tg-ads-kit account-budget 0 100
tg-ads-kit account-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN"
tg-ads-kit account-edit
tg-ads-kit ad-detail 187
tg-ads-kit ad-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN" 187
tg-ads-kit ad-share-stats-page "$TELEGRAM_ADS_ACCOUNT_TOKEN" 187
tg-ads-kit ad-budget-page 187
tg-ads-kit ad-edit-page 187 status
tg-ads-kit ad-daily "$TELEGRAM_ADS_ACCOUNT_TOKEN" 187 202606
tg-ads-kit ad-hourly "$TELEGRAM_ADS_ACCOUNT_TOKEN" 187
tg-ads-kit serve
```

## Quick Start

```ts
import { createTelegramAdsClient } from 'tg-ads-kit';

const client = createTelegramAdsClient({
  cookie: process.env.TELEGRAM_ADS_COOKIE!,
});

const accountToken = process.env.TELEGRAM_ADS_ACCOUNT_TOKEN!;

const dailyRows = await client.fetchAccountDailyRows(accountToken);
const ads = await client.fetchAccountAds();
const monthlyRows = await client.fetchMonthlyReport(accountToken, '202606');

console.log({ dailyRows, ads, monthlyRows });
```

## Direct Parsers

```ts
import {
  mergeAccountDailyRows,
  parseTelegramAdsDailyBudgetCsv,
  parseTelegramAdsDailyStatsCsv,
} from 'tg-ads-kit';

const stats = parseTelegramAdsDailyStatsCsv(statsTsv);
const budget = parseTelegramAdsDailyBudgetCsv(budgetTsv);
const rows = mergeAccountDailyRows(stats, budget);
```

## Supported Reporting Surfaces

- `/csv?prefix=account/{accountToken}&period=day`
- `/csv?prefix=account/{accountToken}/budget&period=day`
- `/csv?prefix=account/{accountToken}&period=5min`
- `/csv?prefix=account/{accountToken}/budget&period=5min`
- `/reports/account/{accountToken}?month={YYYYMM}`
- `/reports/account/{accountToken}/ad/{adId}?month={YYYYMM}`
- `/csv?prefix=ad/{accountToken}/{adId}&period=day`
- `/csv?prefix=ad/{accountToken}/{adId}&period=5min`
- `/csv?prefix=ad/{accountToken}/{adId}/budget&period=5min`
- `/account` ad metadata table
- `/account/stats` account stats page links and table rows
- `/account/ad/{adId}` ad detail form snapshot
- `/account/ad/{adId}/stats` ad stats page links and table rows
- `/account/ad/{adId}/stats/share` shared ad stats page links and table rows
- `/account/budget` account budget transactions
- `/account/edit` account info form snapshot
- `/account/ad/{adId}/budget` ad budget form snapshot
- `/account/ad/{adId}/edit_{cpm|budget|status}` edit form snapshots

Money is represented as TON micros, where `1 TON = 1_000_000` micros.

## Hourly Data

Telegram Ads hourly CSVs are observed as five-minute rows. The parser groups
them into hourly rows and returns only complete hours containing 12 five-minute
intervals. This is intentional because the current hour can be incomplete.

Account-level hourly rows use the account five-minute CSVs and ad-level hourly
rows use the ad five-minute CSVs. Other observed period values that return daily
rows are not treated as hourly data.

Use `parseTelegramAdsAdFiveMinuteStatsCsv` or
`parseTelegramAdsAdFiveMinuteBudgetCsv` if you need the raw five-minute rows.

## Page Snapshots

The package exposes authenticated Telegram Ads HTML pages as typed read-only
snapshots. This includes form field values from account, ad, budget, and edit
pages. These methods only perform GET requests. They do not submit forms, call
Telegram's internal `/api?hash=...` endpoint, or mutate campaigns.

## Errors

The package fails clearly when required columns, dates, numbers, account tokens,
or session cookies are invalid. It does not support legacy aliases or silent
fallback response shapes.

HTTP failures throw `TelegramAdsHttpError`. Parser and validation failures throw
`TelegramAdsParseError` or `TelegramAdsValidationError`.

## Security

Do not commit Telegram Ads cookies or account tokens. Treat the Cookie header as
a secret and rotate it if exposed.

## License

MIT
