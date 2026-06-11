import {
  escapeRegExp,
  normalizeAdId,
  normalizeHtmlText,
  normalizeOptionalAdId,
  normalizeTelegramDate,
  normalizeTelegramDateTimeUtc,
  parseDelimitedRows,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parseTonMicros,
  requireCsvValue,
} from './internal.js';
import { TelegramAdsParseError } from './errors.js';
import type {
  TelegramAdsAccountDailyBudgetRow,
  TelegramAdsAccountDailyStatsRow,
  TelegramAdsAdFiveMinuteBudgetRow,
  TelegramAdsAdFiveMinuteStatsRow,
  TelegramAdsAdMetadataRow,
  TelegramAdsAdMonthlyRow,
  TelegramAdsAdDailyReportRow,
  TelegramAdsAdDailyStatsRow,
  TelegramAdsAdHourlyBudgetRow,
  TelegramAdsAdHourlyRow,
  TelegramAdsAdHourlyStatsRow,
} from './types.js';
import { TELEGRAM_ADS_STATUSES } from './types.js';

export function parseTelegramAdsDailyStatsCsv(csv: string): Map<string, TelegramAdsAccountDailyStatsRow> {
  const rows = parseDelimitedRows(csv);
  const out = new Map<string, TelegramAdsAccountDailyStatsRow>();
  for (const row of rows) {
    const statDate = normalizeTelegramDate(requireCsvValue(row, 'date'));
    out.set(statDate, {
      statDate,
      impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
      clicks: parseNonNegativeInteger(requireCsvValue(row, 'Clicks')),
      conversions: parseNonNegativeNumber(requireCsvValue(row, 'Actions')),
    });
  }
  return out;
}

export function parseTelegramAdsDailyBudgetCsv(csv: string): Map<string, TelegramAdsAccountDailyBudgetRow> {
  const rows = parseDelimitedRows(csv);
  const out = new Map<string, TelegramAdsAccountDailyBudgetRow>();
  for (const row of rows) {
    const statDate = normalizeTelegramDate(requireCsvValue(row, 'date'));
    out.set(statDate, {
      statDate,
      costMicros: parseTonMicros(requireCsvValue(row, 'Spent budget, TON')),
    });
  }
  return out;
}

export function parseTelegramAdsMonthlyReportCsv(csv: string, statMonth: string): TelegramAdsAdMonthlyRow[] {
  const rows = parseDelimitedRows(csv);
  return rows
    .map((row) => {
      const adId = normalizeOptionalAdId(row['Ad ID']);
      if (!adId) return null;

      return {
        statMonth,
        adId,
        adTitle: requireCsvValue(row, 'Ad Title'),
        impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
        clicks: 0,
        costMicros: parseTonMicros(requireCsvValue(row, 'Amount, TON')),
        conversions: 0,
      };
    })
    .filter((row): row is TelegramAdsAdMonthlyRow => row !== null);
}

export function parseTelegramAdsAdDailyReportCsv(adId: string, csv: string): TelegramAdsAdDailyReportRow[] {
  const normalizedAdId = normalizeAdId(adId);
  const rows = parseDelimitedRows(csv);
  return rows
    .map((row) => {
      const rawDay = requireCsvValue(row, 'Day');
      if (/^Total in /i.test(rawDay)) return null;

      return {
        adId: normalizedAdId,
        statDate: normalizeTelegramDate(rawDay),
        impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
        costMicros: parseTonMicros(requireCsvValue(row, 'Amount, TON')),
      };
    })
    .filter((row): row is TelegramAdsAdDailyReportRow => row !== null);
}

export function parseTelegramAdsAdDailyStatsCsv(adId: string, csv: string): TelegramAdsAdDailyStatsRow[] {
  const normalizedAdId = normalizeAdId(adId);
  const rows = parseDelimitedRows(csv);
  return rows.map((row) => ({
    adId: normalizedAdId,
    statDate: normalizeTelegramDate(requireCsvValue(row, 'date')),
    impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
    clicks: parseNonNegativeInteger(requireCsvValue(row, 'Clicks')),
    conversions: parseNonNegativeNumber(requireCsvValue(row, 'Joined')),
  }));
}

export function parseTelegramAdsAdFiveMinuteStatsCsv(adId: string, csv: string): TelegramAdsAdFiveMinuteStatsRow[] {
  const normalizedAdId = normalizeAdId(adId);
  const rows = parseDelimitedRows(csv);
  return rows.map((row) => ({
    adId: normalizedAdId,
    ...normalizeTelegramDateTimeUtc(requireCsvValue(row, 'date')),
    impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
    clicks: parseNonNegativeInteger(requireCsvValue(row, 'Clicks')),
    conversions: parseNonNegativeNumber(requireCsvValue(row, 'Joined')),
  }));
}

export function parseTelegramAdsAdFiveMinuteBudgetCsv(adId: string, csv: string): TelegramAdsAdFiveMinuteBudgetRow[] {
  const normalizedAdId = normalizeAdId(adId);
  const rows = parseDelimitedRows(csv);
  return rows.map((row) => ({
    adId: normalizedAdId,
    ...normalizeTelegramDateTimeUtc(requireCsvValue(row, 'date')),
    costMicros: parseTonMicros(requireCsvValue(row, 'Spent budget, TON')),
  }));
}

export function parseTelegramAdsAdHourlyStatsCsv(adId: string, csv: string): TelegramAdsAdHourlyStatsRow[] {
  return aggregateTelegramAdsHourlyStatsRows(parseTelegramAdsAdFiveMinuteStatsCsv(adId, csv));
}

export function parseTelegramAdsAdHourlyBudgetCsv(adId: string, csv: string): TelegramAdsAdHourlyBudgetRow[] {
  return aggregateTelegramAdsHourlyBudgetRows(parseTelegramAdsAdFiveMinuteBudgetCsv(adId, csv));
}

export function aggregateTelegramAdsHourlyStatsRows(
  rows: TelegramAdsAdFiveMinuteStatsRow[],
): TelegramAdsAdHourlyStatsRow[] {
  const groups = new Map<string, TelegramAdsAdHourlyStatsRow & { intervalCount: number }>();
  for (const row of rows) {
    const key = buildAdBucketKey(row.adId, row.bucketStartUtc);
    const existing = groups.get(key);
    groups.set(key, {
      adId: row.adId,
      bucketStartUtc: row.bucketStartUtc,
      statDate: row.statDate,
      statHour: row.statHour,
      impressions: (existing?.impressions ?? 0) + row.impressions,
      clicks: (existing?.clicks ?? 0) + row.clicks,
      conversions: (existing?.conversions ?? 0) + row.conversions,
      intervalCount: (existing?.intervalCount ?? 0) + 1,
    });
  }

  return [...groups.values()]
    .filter((row) => row.intervalCount === 12)
    .map(({ intervalCount: _intervalCount, ...row }) => row)
    .sort(compareHourlyRows);
}

export function aggregateTelegramAdsHourlyBudgetRows(
  rows: TelegramAdsAdFiveMinuteBudgetRow[],
): TelegramAdsAdHourlyBudgetRow[] {
  const groups = new Map<string, TelegramAdsAdHourlyBudgetRow & { intervalCount: number }>();
  for (const row of rows) {
    const key = buildAdBucketKey(row.adId, row.bucketStartUtc);
    const existing = groups.get(key);
    groups.set(key, {
      adId: row.adId,
      bucketStartUtc: row.bucketStartUtc,
      statDate: row.statDate,
      statHour: row.statHour,
      costMicros: (existing?.costMicros ?? 0) + row.costMicros,
      intervalCount: (existing?.intervalCount ?? 0) + 1,
    });
  }

  return [...groups.values()]
    .filter((row) => row.intervalCount === 12)
    .map(({ intervalCount: _intervalCount, ...row }) => row)
    .sort(compareHourlyRows);
}

export function parseTelegramAdsAccountAds(html: string): TelegramAdsAdMetadataRow[] {
  const tableRows = [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map((match) => match[0]);
  const rows: TelegramAdsAdMetadataRow[] = [];
  for (const tableRow of tableRows) {
    const idMatch = tableRow.match(/<a\b[^>]*href=["']\/account\/ad\/(\d+)["'][^>]*>/i);
    if (!idMatch?.[1]) continue;

    const adId = idMatch[1];
    rows.push({
      adId,
      adTitle: extractAdTitleFromRow(tableRow, adId),
      adStatus: extractAdStatusFromRow(tableRow),
      cpmMicros: extractColumnMoneyMicros(tableRow, 'cpm'),
      currentBudgetMicros: extractColumnMoneyMicros(tableRow, 'budget'),
    });
  }

  if (!rows.length) {
    throw new TelegramAdsParseError('Telegram Ads account page did not contain any ad rows');
  }

  return mergeAdMetadataRows(rows, []);
}

function extractAdTitleFromRow(rowHtml: string, adId: string): string {
  const linkMatch = rowHtml.match(
    new RegExp(`<a\\b[^>]*href=["']/account/ad/${escapeRegExp(adId)}["'][^>]*>([\\s\\S]*?)</a>`, 'i'),
  );
  const title = normalizeHtmlText(linkMatch?.[1] ?? '');
  if (!title) {
    throw new TelegramAdsParseError(`Telegram Ads account row ${adId} did not contain an ad title`);
  }
  return title;
}

function extractAdStatusFromRow(rowHtml: string): TelegramAdsAdMetadataRow['adStatus'] {
  const statusCell = extractColumnCell(rowHtml, 'status');
  if (!statusCell) return null;

  const text = normalizeHtmlText(statusCell);
  for (const status of TELEGRAM_ADS_STATUSES) {
    if (new RegExp(`\\b${escapeRegExp(status)}\\b`, 'i').test(text)) {
      return status;
    }
  }

  return null;
}

function extractColumnMoneyMicros(rowHtml: string, columnName: string): number | null {
  const cell = extractColumnCell(rowHtml, columnName);
  if (!cell) return null;

  const withoutSvg = cell.replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ');
  const text = normalizeHtmlText(withoutSvg);
  const money = text.replace(/[^\d.,]/g, '');
  return money ? parseTonMicros(money) : null;
}

function extractColumnCell(rowHtml: string, columnName: string): string | null {
  const columnPattern = escapeRegExp(`--coldp-${columnName}`);
  const cellMatch = rowHtml.match(new RegExp(`<td\\b(?=[^>]*${columnPattern})[^>]*>[\\s\\S]*?</td>`, 'i'));
  return cellMatch?.[0] ?? null;
}

function mergeAdMetadataRows(
  primary: TelegramAdsAdMetadataRow[],
  secondary: TelegramAdsAdMetadataRow[],
): TelegramAdsAdMetadataRow[] {
  const byId = new Map<string, TelegramAdsAdMetadataRow>();
  for (const row of [...secondary, ...primary]) {
    const existing = byId.get(row.adId);
    byId.set(row.adId, {
      adId: row.adId,
      adTitle: row.adTitle || existing?.adTitle || row.adId,
      adStatus: row.adStatus ?? existing?.adStatus ?? null,
      cpmMicros: row.cpmMicros ?? existing?.cpmMicros ?? null,
      currentBudgetMicros: row.currentBudgetMicros ?? existing?.currentBudgetMicros ?? null,
    });
  }
  return [...byId.values()];
}

function compareHourlyRows(
  left: Pick<TelegramAdsAdHourlyRow, 'adId' | 'bucketStartUtc'>,
  right: Pick<TelegramAdsAdHourlyRow, 'adId' | 'bucketStartUtc'>,
): number {
  return left.bucketStartUtc.localeCompare(right.bucketStartUtc) || left.adId.localeCompare(right.adId);
}

function buildAdBucketKey(adId: string, bucketStartUtc: string): string {
  return `${adId}:${bucketStartUtc}`;
}

