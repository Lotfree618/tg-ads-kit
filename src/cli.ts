#!/usr/bin/env node
import { createTelegramAdsApiServer } from './api.js';
import { createTelegramAdsClient } from './client.js';
import { loadTelegramAdsApiConfig } from './config.js';
import { normalizeAccountToken, normalizeAdId, normalizeStatMonth } from './internal.js';

const [command, ...args] = process.argv.slice(2);

void main();

async function main(): Promise<void> {
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') {
      printHelp();
      process.exitCode = command ? 0 : 1;
    } else if (command === 'serve') {
      await serve();
    } else if (command === 'account-daily') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      printJson(await createClient().fetchAccountDailyRows(accountToken));
    } else if (command === 'monthly') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      const month = normalizeStatMonth(args[1], 'month');
      printJson(await createClient().fetchMonthlyReport(accountToken, month));
    } else if (command === 'session-ads') {
      printJson(await createClient().fetchAccountAds());
    } else if (command === 'ad-daily') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      const adId = normalizeAdId(args[1], 'adId');
      const month = normalizeStatMonth(args[2], 'month');
      printJson(await createClient().fetchAdDailyRows(accountToken, adId, month));
    } else if (command === 'ad-hourly') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      const adId = normalizeAdId(args[1], 'adId');
      printJson(await createClient().fetchAdHourlyRows(accountToken, adId));
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  }
}

async function serve(): Promise<void> {
  const config = loadTelegramAdsApiConfig();
  const app = createTelegramAdsApiServer({
    cookie: config.cookie,
    apiToken: config.apiToken,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
    logger: true,
  });
  await app.listen({
    host: config.host,
    port: config.port,
  });
}

function createClient() {
  const config = loadTelegramAdsApiConfig();
  return createTelegramAdsClient({
    cookie: config.cookie,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  });
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function printHelp(): void {
  process.stdout.write(`tg-ads-kit

Usage:
  tg-ads-kit serve
  tg-ads-kit account-daily <accountToken>
  tg-ads-kit monthly <accountToken> <YYYYMM>
  tg-ads-kit session-ads
  tg-ads-kit ad-daily <accountToken> <adId> <YYYYMM>
  tg-ads-kit ad-hourly <accountToken> <adId>

Environment:
  TELEGRAM_ADS_COOKIE  Required ads.telegram.org Cookie header
  TG_ADS_API_TOKEN     Required bearer token for the HTTP API server
  HOST                 Optional server host, default 127.0.0.1
  PORT                 Optional server port, default 3000
`);
}
