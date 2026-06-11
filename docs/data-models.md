# Data Models

This package normalizes Telegram Ads CSV, TSV, and HTML pages into plain typed
objects. Field names are stable package contracts; Telegram's source HTML and
CSV labels are not exposed as the primary API shape.

## Money

All TON values are represented as micros:

```txt
1 TON = 1_000_000 micros
```

Examples:

- `costMicros`
- `cpmMicros`
- `currentBudgetMicros`
- `dailyBudgetMicros`
- `balanceMicros`

Use integer math for storage and aggregation. Convert to TON only at display
time.

## Dates and Time

Daily rows use ISO dates:

```txt
YYYY-MM-DD
```

Hourly rows use UTC bucket starts:

```txt
bucketStartUtc: 2026-06-11T13:00:00.000Z
statDate: 2026-06-11
statHour: 13
```

Telegram Ads exposes hourly reporting as five-minute CSV rows. The package
returns an hourly row only when all 12 five-minute intervals for that hour are
present. This avoids returning incomplete current-hour data.

## Reporting Rows

Account daily rows include:

- `statDate`
- `impressions`
- `clicks`
- `costMicros`
- `conversions`

Account hourly rows include:

- `bucketStartUtc`
- `statDate`
- `statHour`
- `impressions`
- `clicks`
- `costMicros`
- `conversions`

Ad rows include the same metrics plus `adId` where the row is ad-scoped.

Monthly report rows include:

- `statMonth`
- `adId`
- `adTitle`
- `impressions`
- `clicks`
- `costMicros`
- `conversions`

## Page Snapshots

Page snapshot methods return structured summaries of authenticated Telegram Ads
HTML pages. They are GET-only reads and do not mutate Telegram Ads data.

Common snapshot types:

- `TelegramAdsPageLink`: `{ href, text }`
- `TelegramAdsHtmlForm`: form class, method, action, inputs, and buttons
- `TelegramAdsHtmlFormInput`: input tag name, name, type, value, placeholder,
  and checked state

Important page snapshot objects:

- `TelegramAdsAccountStatsPage`: report links, table rows, and page links
- `TelegramAdsAccountBudgetPage`: account balance, budget transactions,
  pagination, and links
- `TelegramAdsAdDetailPage`: current ad form fields such as title, CPM, budget,
  schedule, target type, and target count
- `TelegramAdsAdStatsPage`: report links, optional share stats path, table
  rows, and page links
- `TelegramAdsAdEditPage`: current form fields for `cpm`, `budget`, or `status`
  edit pages

## Strict Contracts

The package fails clearly when required fields, dates, numbers, cookies, account
tokens, or ad IDs are invalid. It does not accept undocumented aliases or silent
fallback response shapes.
