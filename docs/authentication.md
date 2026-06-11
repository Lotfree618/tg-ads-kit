# Authentication

`tg-ads-kit` uses the same authenticated browser session that
`https://ads.telegram.org` uses.

## Telegram Ads Cookie

Set `TELEGRAM_ADS_COOKIE` to the full HTTP `Cookie` request header sent by your
browser when it is logged in to `https://ads.telegram.org`.

It should look like a semicolon-separated cookie header:

```txt
stel_adowner=...; stel_ssid=...; stel_token=...
```

The exact cookie names and values are controlled by Telegram Ads. The package
only validates that the header looks like an ads.telegram.org session cookie by
requiring a `stel_` cookie to be present.

## How to Get the Cookie

1. Log in to `https://ads.telegram.org` in a browser.
2. Open browser developer tools.
3. Open the Network tab.
4. Reload an authenticated Telegram Ads page such as `/account`.
5. Select the request to `ads.telegram.org`.
6. Copy the full `Cookie` request header.
7. Store it outside source control, for example in `.env`.

Do not copy response headers, individual cookie fragments, or JavaScript values.
The client expects the complete request Cookie header.

## Account Token

Most reporting methods also need the Telegram Ads account token. You can find it
in report links such as:

```txt
/reports/account/{accountToken}?month=202606
```

Use the `{accountToken}` segment as `TELEGRAM_ADS_ACCOUNT_TOKEN` in local smoke
tests or pass it directly to client methods.

## Local API Token

`TG_ADS_API_TOKEN` is not a Telegram token. It is your own bearer token for the
standalone HTTP API server.

```bash
curl "http://127.0.0.1:3000/v1/accounts/$TELEGRAM_ADS_ACCOUNT_TOKEN/daily" \
  -H "Authorization: Bearer $TG_ADS_API_TOKEN"
```

Use a long random value and keep it private.

## Rotation

Rotate the Telegram Ads browser session if the cookie is exposed. Rotate
`TG_ADS_API_TOKEN` if the standalone HTTP API token is exposed.
