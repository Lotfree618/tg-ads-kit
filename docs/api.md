# HTTP API

`tg-ads-kit` can run as a standalone HTTP API service that pulls reporting data
from `ads.telegram.org`.

## Authentication

All data routes require:

```txt
Authorization: Bearer <TG_ADS_API_TOKEN>
```

`/health` is public.

## Routes

### `GET /health`

Returns service status.

### `GET /v1/accounts/:accountToken/daily`

Fetches account daily stats and budget, then returns merged rows.

### `GET /v1/accounts/:accountToken/monthly?month=YYYYMM`

Fetches the account monthly ad report for the requested month.

### `GET /v1/session/ads`

Fetches ad metadata from the account page available to the configured Telegram
Ads session cookie.

### `GET /v1/accounts/:accountToken/ads/:adId/daily?month=YYYYMM`

Fetches and merges ad report rows with daily stats rows.

### `GET /v1/accounts/:accountToken/ads/:adId/hourly`

Fetches five-minute ad stats and budget rows, groups complete 12-interval
hours, and returns merged hourly rows.

### `GET /v1/accounts/:accountToken/snapshot?month=YYYYMM`

Fetches account daily rows, monthly report rows, and session ad metadata in one
response.

## Response Shape

Successful responses:

```json
{
  "ok": true,
  "data": {}
}
```

Failed responses:

```json
{
  "ok": false,
  "error": {
    "name": "TelegramAdsValidationError",
    "message": "month must be in YYYYMM format"
  }
}
```

## Example

```bash
curl http://127.0.0.1:3000/v1/accounts/$TELEGRAM_ADS_ACCOUNT_TOKEN/daily \
  -H "Authorization: Bearer $TG_ADS_API_TOKEN"
```

