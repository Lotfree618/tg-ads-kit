# tg-ads-kit

Unofficial Telegram Ads reporting client and parser toolkit for Node.js and
TypeScript.

This package reads the CSV, TSV, and account HTML surfaces exposed by
`https://ads.telegram.org` and normalizes them into typed JavaScript objects.
It is not an official Telegram project and does not implement ad mutation or
campaign management.

## Install

```bash
npm install tg-ads-kit
```

## Requirements

- Node.js 20 or newer.
- A valid `ads.telegram.org` browser Cookie header.
- A Telegram Ads account token from the account report URLs.

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
- `/reports/account/{accountToken}?month={YYYYMM}`
- `/reports/account/{accountToken}/ad/{adId}?month={YYYYMM}`
- `/csv?prefix=ad/{accountToken}/{adId}&period=day`
- `/csv?prefix=ad/{accountToken}/{adId}/budget&period=day`
- `/account` ad metadata table

Money is represented as TON micros, where `1 TON = 1_000_000` micros.

## Hourly Data

Telegram Ads hourly CSVs are observed as five-minute rows. The parser groups
them into hourly rows and returns only complete hours containing 12 five-minute
intervals. This is intentional because the current hour can be incomplete.

Use `parseTelegramAdsAdFiveMinuteStatsCsv` or
`parseTelegramAdsAdFiveMinuteBudgetCsv` if you need the raw five-minute rows.

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

