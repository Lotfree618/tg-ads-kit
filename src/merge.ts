import { TelegramAdsParseError } from './errors.js';
import type {
  TelegramAdsAccountDailyBudgetRow,
  TelegramAdsAccountDailyRow,
  TelegramAdsAccountDailyStatsRow,
  TelegramAdsAccountHourlyBudgetRow,
  TelegramAdsAccountHourlyRow,
  TelegramAdsAccountHourlyStatsRow,
  TelegramAdsAdDailyReportRow,
  TelegramAdsAdDailyRow,
  TelegramAdsAdDailyStatsRow,
  TelegramAdsAdHourlyBudgetRow,
  TelegramAdsAdHourlyRow,
  TelegramAdsAdHourlyStatsRow,
  TelegramAdsAdMonthlyRow,
} from './types.js';

export function mergeAccountDailyRows(
  statsByDate: Map<string, TelegramAdsAccountDailyStatsRow>,
  budgetByDate: Map<string, TelegramAdsAccountDailyBudgetRow>,
): TelegramAdsAccountDailyRow[] {
  const dates = [...new Set([...statsByDate.keys(), ...budgetByDate.keys()])].sort();
  return dates.map((statDate) => {
    const stats = statsByDate.get(statDate);
    const budget = budgetByDate.get(statDate);
    return {
      statDate,
      impressions: stats?.impressions ?? 0,
      clicks: stats?.clicks ?? 0,
      costMicros: budget?.costMicros ?? 0,
      conversions: stats?.conversions ?? 0,
    };
  });
}

export function mergeAccountHourlyRows(
  statsRows: TelegramAdsAccountHourlyStatsRow[],
  budgetRows: TelegramAdsAccountHourlyBudgetRow[],
): TelegramAdsAccountHourlyRow[] {
  const budgetByBucket = new Map(budgetRows.map((row) => [row.bucketStartUtc, row]));
  const statsKeys = new Set(statsRows.map((row) => row.bucketStartUtc));

  for (const row of statsRows) {
    if (!budgetByBucket.has(row.bucketStartUtc)) {
      throw new TelegramAdsParseError(`Telegram Ads account hourly budget missing for hour ${row.bucketStartUtc}`);
    }
  }

  for (const row of budgetRows) {
    if (!statsKeys.has(row.bucketStartUtc)) {
      throw new TelegramAdsParseError(`Telegram Ads account hourly stats missing for hour ${row.bucketStartUtc}`);
    }
  }

  return statsRows.map((row) => ({
    ...row,
    costMicros: budgetByBucket.get(row.bucketStartUtc)!.costMicros,
  }));
}

export function mergeMonthlyRowsWithAdStats(
  monthlyRows: TelegramAdsAdMonthlyRow[],
  adStatsRows: TelegramAdsAdDailyStatsRow[],
): TelegramAdsAdMonthlyRow[] {
  const statsByAdMonth = new Map<string, { impressions: number; clicks: number; conversions: number }>();
  for (const row of adStatsRows) {
    const key = buildAdMonthKey(row.adId, row.statDate.slice(0, 7).replace('-', ''));
    const existing = statsByAdMonth.get(key);
    statsByAdMonth.set(key, {
      impressions: (existing?.impressions ?? 0) + row.impressions,
      clicks: (existing?.clicks ?? 0) + row.clicks,
      conversions: (existing?.conversions ?? 0) + row.conversions,
    });
  }

  return monthlyRows.map((row) => {
    const stats = statsByAdMonth.get(buildAdMonthKey(row.adId, row.statMonth));
    if (!stats) {
      throw new TelegramAdsParseError(`Telegram Ads ad stats missing for ad ${row.adId} month ${row.statMonth}`);
    }

    return {
      ...row,
      clicks: stats.clicks,
      conversions: stats.conversions,
    };
  });
}

export function mergeAdDailyRows(
  reportRows: TelegramAdsAdDailyReportRow[],
  statsRows: TelegramAdsAdDailyStatsRow[],
): TelegramAdsAdDailyRow[] {
  const statsByAdDate = new Map(statsRows.map((row) => [buildAdDateKey(row.adId, row.statDate), row]));
  return reportRows.map((row) => {
    const stats = statsByAdDate.get(buildAdDateKey(row.adId, row.statDate));
    if (!stats) {
      throw new TelegramAdsParseError(`Telegram Ads ad daily stats missing for ad ${row.adId} date ${row.statDate}`);
    }

    return {
      statDate: row.statDate,
      adId: row.adId,
      impressions: row.impressions,
      clicks: stats.clicks,
      costMicros: row.costMicros,
      conversions: stats.conversions,
    };
  });
}

export function mergeAdHourlyRows(
  statsRows: TelegramAdsAdHourlyStatsRow[],
  budgetRows: TelegramAdsAdHourlyBudgetRow[],
): TelegramAdsAdHourlyRow[] {
  const budgetByAdBucket = new Map(budgetRows.map((row) => [buildAdBucketKey(row.adId, row.bucketStartUtc), row]));
  const statsKeys = new Set(statsRows.map((row) => buildAdBucketKey(row.adId, row.bucketStartUtc)));

  for (const row of statsRows) {
    if (!budgetByAdBucket.has(buildAdBucketKey(row.adId, row.bucketStartUtc))) {
      throw new TelegramAdsParseError(`Telegram Ads ad hourly budget missing for ad ${row.adId} hour ${row.bucketStartUtc}`);
    }
  }

  for (const row of budgetRows) {
    if (!statsKeys.has(buildAdBucketKey(row.adId, row.bucketStartUtc))) {
      throw new TelegramAdsParseError(`Telegram Ads ad hourly stats missing for ad ${row.adId} hour ${row.bucketStartUtc}`);
    }
  }

  return statsRows.map((row) => ({
    ...row,
    costMicros: budgetByAdBucket.get(buildAdBucketKey(row.adId, row.bucketStartUtc))!.costMicros,
  }));
}

function buildAdMonthKey(adId: string, statMonth: string): string {
  return `${adId}:${statMonth}`;
}

function buildAdDateKey(adId: string, statDate: string): string {
  return `${adId}:${statDate}`;
}

function buildAdBucketKey(adId: string, bucketStartUtc: string): string {
  return `${adId}:${bucketStartUtc}`;
}
