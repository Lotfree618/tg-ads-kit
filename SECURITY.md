# Security

Do not open public issues containing Telegram Ads cookies, account tokens, raw
account pages, or unredacted reports.

If you discover a security issue in this package, report it privately to the
maintainers of the repository where this project is hosted.

## Session cookies

This package accepts an ads.telegram.org browser Cookie header for read-only
reporting requests. Treat that cookie as a secret with the same care as an API
token. Store it outside source control and rotate it if it is exposed.

