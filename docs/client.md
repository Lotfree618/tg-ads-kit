# TypeScript Client

`tg-ads-kit` exports a typed client for the authenticated Telegram Ads reporting
and page surfaces currently supported by this package.

## Create a Client

```ts
import { createTelegramAdsClient } from 'tg-ads-kit';

const client = createTelegramAdsClient({
  cookie: process.env.TELEGRAM_ADS_COOKIE!,
});
```

The cookie must be a browser Cookie header for `https://ads.telegram.org`.

## Reporting Methods

Account reporting:

```ts
const dailyRows = await client.fetchAccountDailyRows(accountToken);
const hourlyRows = await client.fetchAccountHourlyRows(accountToken);
const monthlyRows = await client.fetchMonthlyReport(accountToken, '202606');
```

Ad reporting:

```ts
const adDailyRows = await client.fetchAdDailyRows(accountToken, '187', '202606');
const adHourlyRows = await client.fetchAdHourlyRows(accountToken, '187');
```

Raw CSV access is also available:

```ts
const accountStatsCsv = await client.fetchAccountDailyStatsCsv(accountToken);
const accountBudgetCsv = await client.fetchAccountDailyBudgetCsv(accountToken);
const adReportCsv = await client.fetchAdDailyReportCsv(accountToken, '187', '202606');
```

## Page Snapshot Methods

These methods only perform GET requests. They read Telegram Ads HTML pages and
return typed snapshots. They do not submit forms and do not call Telegram's
internal `/api?hash=...` endpoint.

```ts
const ads = await client.fetchAccountAds();
const accountStats = await client.fetchAccountStatsPage(accountToken);
const accountBudget = await client.fetchAccountBudgetPage(0, 100);
const accountEdit = await client.fetchAccountEditPage();

const adDetail = await client.fetchAdDetail('187');
const adStats = await client.fetchAdStatsPage(accountToken, '187');
const adShareStats = await client.fetchAdShareStatsPage(accountToken, '187');
const adBudget = await client.fetchAdBudgetPage('187');
const adStatusForm = await client.fetchAdEditPage('187', 'status');
```

Supported edit page sections are `cpm`, `budget`, and `status`.

## Direct Parsers

Parser functions can be used without the HTTP client when you already have a
Telegram Ads CSV or HTML payload:

```ts
import {
  mergeAccountDailyRows,
  parseTelegramAdsDailyBudgetCsv,
  parseTelegramAdsDailyStatsCsv,
} from 'tg-ads-kit';

const stats = parseTelegramAdsDailyStatsCsv(statsCsv);
const budget = parseTelegramAdsDailyBudgetCsv(budgetCsv);
const rows = mergeAccountDailyRows(stats, budget);
```

Parser failures throw `TelegramAdsParseError`. Invalid inputs throw
`TelegramAdsValidationError`. Upstream HTTP failures throw
`TelegramAdsHttpError`.
