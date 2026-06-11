#!/usr/bin/env node
import 'dotenv/config';
import { createTelegramAdsApiServer } from './api.js';
import { createTelegramAdsClient } from './client.js';
import { loadTelegramAdsApiConfig } from './config.js';
import {
  normalizeAccountToken,
  normalizeAdEditSection,
  normalizeAdId,
  normalizeNonNegativeIntegerInput,
  normalizePositiveIntegerInput,
  normalizeStatMonth,
} from './internal.js';

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
    } else if (command === 'account-hourly') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      printJson(await createClient().fetchAccountHourlyRows(accountToken));
    } else if (command === 'monthly') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      const month = normalizeStatMonth(args[1], 'month');
      printJson(await createClient().fetchMonthlyReport(accountToken, month));
    } else if (command === 'session-ads') {
      printJson(await createClient().fetchAccountAds());
    } else if (command === 'account-budget') {
      const offset = args[0] === undefined ? undefined : normalizeNonNegativeIntegerInput(args[0], 'offset');
      const limit = args[1] === undefined ? undefined : normalizePositiveIntegerInput(args[1], 'limit');
      printJson(await createClient().fetchAccountBudgetPage(offset, limit));
    } else if (command === 'account-edit') {
      printJson(await createClient().fetchAccountEditPage());
    } else if (command === 'ad-detail') {
      const adId = normalizeAdId(args[0], 'adId');
      printJson(await createClient().fetchAdDetail(adId));
    } else if (command === 'ad-stats-page') {
      const accountToken = normalizeAccountToken(args[0], 'accountToken');
      const adId = normalizeAdId(args[1], 'adId');
      printJson(await createClient().fetchAdStatsPage(accountToken, adId));
    } else if (command === 'ad-budget-page') {
      const adId = normalizeAdId(args[0], 'adId');
      printJson(await createClient().fetchAdBudgetPage(adId));
    } else if (command === 'ad-edit-page') {
      const adId = normalizeAdId(args[0], 'adId');
      const section = normalizeAdEditSection(args[1], 'section');
      printJson(await createClient().fetchAdEditPage(adId, section));
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
  tg-ads-kit account-hourly <accountToken>
  tg-ads-kit monthly <accountToken> <YYYYMM>
  tg-ads-kit session-ads
  tg-ads-kit account-budget [offset limit]
  tg-ads-kit account-edit
  tg-ads-kit ad-detail <adId>
  tg-ads-kit ad-stats-page <accountToken> <adId>
  tg-ads-kit ad-budget-page <adId>
  tg-ads-kit ad-edit-page <adId> <cpm|budget|status>
  tg-ads-kit ad-daily <accountToken> <adId> <YYYYMM>
  tg-ads-kit ad-hourly <accountToken> <adId>

Environment:
  TELEGRAM_ADS_COOKIE  Required ads.telegram.org Cookie header
  TG_ADS_API_TOKEN     Required bearer token for the HTTP API server
  HOST                 Optional server host, default 127.0.0.1
  PORT                 Optional server port, default 3000
`);
}
