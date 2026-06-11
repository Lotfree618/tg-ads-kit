import { TelegramAdsHttpError, TelegramAdsValidationError } from './errors.js';
import {
  DEFAULT_USER_AGENT,
  TELEGRAM_ADS_BASE_URL,
  maskTelegramAdsCsvPrefix,
  normalizeAccountToken,
  normalizeAdEditSection,
  normalizeAdId,
  normalizeCookieHeader,
  normalizeNonNegativeIntegerInput,
  normalizePositiveIntegerInput,
  normalizeStatMonth,
} from './internal.js';
import { mergeAccountDailyRows, mergeAccountHourlyRows, mergeAdDailyRows, mergeAdHourlyRows } from './merge.js';
import {
  parseTelegramAdsAccountAds,
  parseTelegramAdsAccountBudgetPage,
  parseTelegramAdsAccountEditPage,
  parseTelegramAdsAccountHourlyBudgetCsv,
  parseTelegramAdsAccountHourlyStatsCsv,
  parseTelegramAdsAccountStatsPage,
  parseTelegramAdsAdBudgetPage,
  parseTelegramAdsAdDailyReportCsv,
  parseTelegramAdsAdDailyStatsCsv,
  parseTelegramAdsAdDetailPage,
  parseTelegramAdsAdEditPage,
  parseTelegramAdsAdHourlyBudgetCsv,
  parseTelegramAdsAdHourlyStatsCsv,
  parseTelegramAdsAdStatsPage,
  parseTelegramAdsDailyBudgetCsv,
  parseTelegramAdsDailyStatsCsv,
  parseTelegramAdsMonthlyReportCsv,
} from './parsers.js';
import type { TelegramAdsClient, TelegramAdsClientOptions, TelegramAdsFetch } from './types.js';

export function createTelegramAdsClient(options: TelegramAdsClientOptions): TelegramAdsClient {
  const cookie = normalizeCookieHeader(options.cookie);
  const baseUrl = new URL(String(options.baseUrl ?? TELEGRAM_ADS_BASE_URL));
  const fetcher = resolveFetch(options.fetch);
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  const extraHeaders = options.headers;

  async function getText(path: string, accept: string): Promise<string> {
    const url = new URL(path, baseUrl);
    const response = await fetcher(url.toString(), {
      headers: {
        ...headersToRecord(extraHeaders),
        accept,
        cookie,
        'user-agent': userAgent,
      },
      redirect: 'manual',
    });
    const text = await response.text();
    if (!response.ok) {
      const description = describeTelegramAdsRequest(url);
      const preview = text.slice(0, 300);
      throw new TelegramAdsHttpError(`Telegram Ads ${description} failed with ${response.status}: ${preview}`, response.status, preview);
    }
    return text;
  }

  return {
    getText,

    async fetchAccountDailyStatsCsv(accountToken) {
      const normalizedToken = normalizeAccountToken(accountToken);
      return await getText(`/csv?prefix=account/${encodeURIComponent(normalizedToken)}&period=day`, 'text/csv');
    },

    async fetchAccountDailyBudgetCsv(accountToken) {
      const normalizedToken = normalizeAccountToken(accountToken);
      return await getText(`/csv?prefix=account/${encodeURIComponent(normalizedToken)}/budget&period=day`, 'text/csv');
    },

    async fetchAccountDailyRows(accountToken) {
      const [statsCsv, budgetCsv] = await Promise.all([
        this.fetchAccountDailyStatsCsv(accountToken),
        this.fetchAccountDailyBudgetCsv(accountToken),
      ]);
      return mergeAccountDailyRows(parseTelegramAdsDailyStatsCsv(statsCsv), parseTelegramAdsDailyBudgetCsv(budgetCsv));
    },

    async fetchAccountFiveMinuteStatsCsv(accountToken) {
      const normalizedToken = normalizeAccountToken(accountToken);
      return await getText(`/csv?prefix=account/${encodeURIComponent(normalizedToken)}&period=5min`, 'text/csv');
    },

    async fetchAccountFiveMinuteBudgetCsv(accountToken) {
      const normalizedToken = normalizeAccountToken(accountToken);
      return await getText(`/csv?prefix=account/${encodeURIComponent(normalizedToken)}/budget&period=5min`, 'text/csv');
    },

    async fetchAccountHourlyRows(accountToken) {
      const [statsCsv, budgetCsv] = await Promise.all([
        this.fetchAccountFiveMinuteStatsCsv(accountToken),
        this.fetchAccountFiveMinuteBudgetCsv(accountToken),
      ]);
      return mergeAccountHourlyRows(
        parseTelegramAdsAccountHourlyStatsCsv(statsCsv),
        parseTelegramAdsAccountHourlyBudgetCsv(budgetCsv),
      );
    },

    async fetchMonthlyReportCsv(accountToken, statMonth) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedMonth = normalizeStatMonth(statMonth);
      return await getText(`/reports/account/${encodeURIComponent(normalizedToken)}?month=${normalizedMonth}`, 'text/csv');
    },

    async fetchMonthlyReport(accountToken, statMonth) {
      const normalizedMonth = normalizeStatMonth(statMonth);
      const csv = await this.fetchMonthlyReportCsv(accountToken, normalizedMonth);
      return parseTelegramAdsMonthlyReportCsv(csv, normalizedMonth);
    },

    async fetchAccountAdsHtml() {
      return await getText('/account', 'text/html');
    },

    async fetchAccountAds() {
      return parseTelegramAdsAccountAds(await this.fetchAccountAdsHtml());
    },

    async fetchAccountBudgetHtml(offset, limit) {
      const path = buildAccountBudgetPath(offset, limit);
      return await getText(path, 'text/html');
    },

    async fetchAccountBudgetPage(offset, limit) {
      const normalizedOffset = offset === undefined ? null : normalizeNonNegativeIntegerInput(offset, 'offset');
      const normalizedLimit = limit === undefined ? null : normalizePositiveIntegerInput(limit, 'limit');
      return parseTelegramAdsAccountBudgetPage(
        await this.fetchAccountBudgetHtml(normalizedOffset ?? undefined, normalizedLimit ?? undefined),
        normalizedOffset,
        normalizedLimit,
      );
    },

    async fetchAccountStatsHtml(_accountToken) {
      return await getText('/account/stats', 'text/html');
    },

    async fetchAccountStatsPage(accountToken) {
      const normalizedToken = normalizeAccountToken(accountToken);
      return parseTelegramAdsAccountStatsPage(normalizedToken, await this.fetchAccountStatsHtml(normalizedToken));
    },

    async fetchAccountEditHtml() {
      return await getText('/account/edit', 'text/html');
    },

    async fetchAccountEditPage() {
      return parseTelegramAdsAccountEditPage(await this.fetchAccountEditHtml());
    },

    async fetchAdDetailHtml(adId) {
      const normalizedAdId = normalizeAdId(adId);
      return await getText(`/account/ad/${encodeURIComponent(normalizedAdId)}`, 'text/html');
    },

    async fetchAdDetail(adId) {
      const normalizedAdId = normalizeAdId(adId);
      return parseTelegramAdsAdDetailPage(normalizedAdId, await this.fetchAdDetailHtml(normalizedAdId));
    },

    async fetchAdStatsHtml(_accountToken, adId) {
      const normalizedAdId = normalizeAdId(adId);
      return await getText(`/account/ad/${encodeURIComponent(normalizedAdId)}/stats`, 'text/html');
    },

    async fetchAdStatsPage(accountToken, adId) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      return parseTelegramAdsAdStatsPage(normalizedToken, normalizedAdId, await this.fetchAdStatsHtml(normalizedToken, normalizedAdId));
    },

    async fetchAdShareStatsHtml(_accountToken, adId) {
      const normalizedAdId = normalizeAdId(adId);
      return await getText(`/account/ad/${encodeURIComponent(normalizedAdId)}/stats/share`, 'text/html');
    },

    async fetchAdShareStatsPage(accountToken, adId) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      return parseTelegramAdsAdStatsPage(normalizedToken, normalizedAdId, await this.fetchAdShareStatsHtml(normalizedToken, normalizedAdId));
    },

    async fetchAdBudgetHtml(adId) {
      const normalizedAdId = normalizeAdId(adId);
      return await getText(`/account/ad/${encodeURIComponent(normalizedAdId)}/budget`, 'text/html');
    },

    async fetchAdBudgetPage(adId) {
      const normalizedAdId = normalizeAdId(adId);
      return parseTelegramAdsAdBudgetPage(normalizedAdId, await this.fetchAdBudgetHtml(normalizedAdId));
    },

    async fetchAdEditHtml(adId, section) {
      const normalizedAdId = normalizeAdId(adId);
      const normalizedSection = normalizeAdEditSection(section);
      return await getText(`/account/ad/${encodeURIComponent(normalizedAdId)}/edit_${normalizedSection}`, 'text/html');
    },

    async fetchAdEditPage(adId, section) {
      const normalizedAdId = normalizeAdId(adId);
      const normalizedSection = normalizeAdEditSection(section);
      return parseTelegramAdsAdEditPage(normalizedAdId, normalizedSection, await this.fetchAdEditHtml(normalizedAdId, normalizedSection));
    },

    async fetchAdDailyReportCsv(accountToken, adId, statMonth) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      const normalizedMonth = normalizeStatMonth(statMonth);
      return await getText(
        `/reports/account/${encodeURIComponent(normalizedToken)}/ad/${encodeURIComponent(normalizedAdId)}?month=${normalizedMonth}`,
        'text/csv',
      );
    },

    async fetchAdDailyStatsCsv(accountToken, adId) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      return await getText(`/csv?prefix=ad/${encodeURIComponent(normalizedToken)}/${encodeURIComponent(normalizedAdId)}&period=day`, 'text/csv');
    },

    async fetchAdDailyRows(accountToken, adId, statMonth) {
      const normalizedAdId = normalizeAdId(adId);
      const [reportCsv, statsCsv] = await Promise.all([
        this.fetchAdDailyReportCsv(accountToken, normalizedAdId, statMonth),
        this.fetchAdDailyStatsCsv(accountToken, normalizedAdId),
      ]);
      return mergeAdDailyRows(
        parseTelegramAdsAdDailyReportCsv(normalizedAdId, reportCsv),
        parseTelegramAdsAdDailyStatsCsv(normalizedAdId, statsCsv),
      );
    },

    async fetchAdFiveMinuteStatsCsv(accountToken, adId) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      return await getText(
        `/csv?prefix=ad/${encodeURIComponent(normalizedToken)}/${encodeURIComponent(normalizedAdId)}&period=5min`,
        'text/csv',
      );
    },

    async fetchAdFiveMinuteBudgetCsv(accountToken, adId) {
      const normalizedToken = normalizeAccountToken(accountToken);
      const normalizedAdId = normalizeAdId(adId);
      return await getText(
        `/csv?prefix=ad/${encodeURIComponent(normalizedToken)}/${encodeURIComponent(normalizedAdId)}/budget&period=5min`,
        'text/csv',
      );
    },

    async fetchAdHourlyRows(accountToken, adId) {
      const normalizedAdId = normalizeAdId(adId);
      const [statsCsv, budgetCsv] = await Promise.all([
        this.fetchAdFiveMinuteStatsCsv(accountToken, normalizedAdId),
        this.fetchAdFiveMinuteBudgetCsv(accountToken, normalizedAdId),
      ]);
      return mergeAdHourlyRows(
        parseTelegramAdsAdHourlyStatsCsv(normalizedAdId, statsCsv),
        parseTelegramAdsAdHourlyBudgetCsv(normalizedAdId, budgetCsv),
      );
    },
  };
}

function buildAccountBudgetPath(offset: number | undefined, limit: number | undefined): string {
  if (offset === undefined && limit === undefined) return '/account/budget';
  const normalizedOffset = normalizeNonNegativeIntegerInput(offset, 'offset');
  const normalizedLimit = normalizePositiveIntegerInput(limit, 'limit');
  return `/account/budget?offset=${normalizedOffset}&limit=${normalizedLimit}`;
}

function resolveFetch(fetcher: TelegramAdsFetch | undefined): TelegramAdsFetch {
  const resolved = fetcher ?? globalThis.fetch;
  if (typeof resolved !== 'function') {
    throw new TelegramAdsValidationError('fetch is required in this runtime');
  }
  return resolved.bind(globalThis) as TelegramAdsFetch;
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, value]));
  }
  return { ...headers };
}

function describeTelegramAdsRequest(url: URL): string {
  if (url.pathname === '/csv') {
    const prefix = url.searchParams.get('prefix');
    const period = url.searchParams.get('period');
    return `/csv?prefix=${maskTelegramAdsCsvPrefix(prefix)}${period ? `&period=${period}` : ''}`;
  }

  const reportMatch = url.pathname.match(/^\/reports\/account\/[^/]+(\/ad\/\d+)?$/);
  if (reportMatch) {
    const suffix = reportMatch[1] ?? '';
    const month = url.searchParams.get('month');
    return `/reports/account/{accountToken}${suffix}${month ? `?month=${month}` : ''}`;
  }

  return url.pathname;
}
