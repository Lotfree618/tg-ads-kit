import {
  decodeHtmlEntities,
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
  TelegramAdsAccountFiveMinuteBudgetRow,
  TelegramAdsAccountFiveMinuteStatsRow,
  TelegramAdsAccountHourlyBudgetRow,
  TelegramAdsAccountHourlyRow,
  TelegramAdsAccountHourlyStatsRow,
  TelegramAdsAdFiveMinuteBudgetRow,
  TelegramAdsAdFiveMinuteStatsRow,
  TelegramAdsAdBudgetPage,
  TelegramAdsAdDetailPage,
  TelegramAdsAdEditPage,
  TelegramAdsAdEditSection,
  TelegramAdsAdMetadataRow,
  TelegramAdsAdMonthlyRow,
  TelegramAdsAdStatsPage,
  TelegramAdsAccountBudgetPage,
  TelegramAdsBudgetTransactionRow,
  TelegramAdsAdDailyReportRow,
  TelegramAdsAdDailyStatsRow,
  TelegramAdsAdHourlyBudgetRow,
  TelegramAdsAdHourlyRow,
  TelegramAdsAdHourlyStatsRow,
  TelegramAdsAccountEditPage,
  TelegramAdsHtmlForm,
  TelegramAdsHtmlFormButton,
  TelegramAdsHtmlFormInput,
  TelegramAdsPageLink,
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

export function parseTelegramAdsAccountFiveMinuteStatsCsv(csv: string): TelegramAdsAccountFiveMinuteStatsRow[] {
  const rows = parseDelimitedRows(csv);
  return rows.map((row) => ({
    ...normalizeTelegramDateTimeUtc(requireCsvValue(row, 'date')),
    impressions: parseNonNegativeInteger(requireCsvValue(row, 'Views')),
    clicks: parseNonNegativeInteger(requireCsvValue(row, 'Clicks')),
    conversions: parseNonNegativeNumber(requireCsvValue(row, 'Actions')),
  }));
}

export function parseTelegramAdsAccountFiveMinuteBudgetCsv(csv: string): TelegramAdsAccountFiveMinuteBudgetRow[] {
  const rows = parseDelimitedRows(csv);
  return rows.map((row) => ({
    ...normalizeTelegramDateTimeUtc(requireCsvValue(row, 'date')),
    costMicros: parseTonMicros(requireCsvValue(row, 'Spent budget, TON')),
  }));
}

export function parseTelegramAdsAccountHourlyStatsCsv(csv: string): TelegramAdsAccountHourlyStatsRow[] {
  return aggregateTelegramAdsAccountHourlyStatsRows(parseTelegramAdsAccountFiveMinuteStatsCsv(csv));
}

export function parseTelegramAdsAccountHourlyBudgetCsv(csv: string): TelegramAdsAccountHourlyBudgetRow[] {
  return aggregateTelegramAdsAccountHourlyBudgetRows(parseTelegramAdsAccountFiveMinuteBudgetCsv(csv));
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

export function aggregateTelegramAdsAccountHourlyStatsRows(
  rows: TelegramAdsAccountFiveMinuteStatsRow[],
): TelegramAdsAccountHourlyStatsRow[] {
  const groups = new Map<string, TelegramAdsAccountHourlyStatsRow & { intervalCount: number }>();
  for (const row of rows) {
    const existing = groups.get(row.bucketStartUtc);
    groups.set(row.bucketStartUtc, {
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
    .sort(compareAccountHourlyRows);
}

export function aggregateTelegramAdsAccountHourlyBudgetRows(
  rows: TelegramAdsAccountFiveMinuteBudgetRow[],
): TelegramAdsAccountHourlyBudgetRow[] {
  const groups = new Map<string, TelegramAdsAccountHourlyBudgetRow & { intervalCount: number }>();
  for (const row of rows) {
    const existing = groups.get(row.bucketStartUtc);
    groups.set(row.bucketStartUtc, {
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
    .sort(compareAccountHourlyRows);
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

export function parseTelegramAdsAdDetailPage(adId: string, html: string): TelegramAdsAdDetailPage {
  const normalizedAdId = normalizeAdId(adId);
  const form = extractRequiredForm(html, /js-ad-form/);
  const fields = indexFormFields(form);
  const title = extractPageTitle(html);

  return {
    adId: normalizedAdId,
    title,
    form,
    fields: {
      title: fields.get('title') ?? null,
      text: fields.get('text') ?? null,
      promoteUrl: fields.get('promote_url') ?? null,
      websiteName: fields.get('website_name') ?? null,
      cpmMicros: parseOptionalTonMicros(fields.get('cpm')),
      dailyBudgetMicros: parseOptionalTonMicros(fields.get('daily_budget')),
      viewsPerUser: parseOptionalInteger(fields.get('views_per_user')),
      active: parseOptionalBoolean(fields.get('active')),
      activateDate: fields.get('ad_activate_date') ?? null,
      activateTime: fields.get('ad_activate_time') ?? null,
      deactivateDate: fields.get('ad_deactivate_date') ?? null,
      deactivateTime: fields.get('ad_deactivate_time') ?? null,
      usesSchedule: fields.get('use_schedule') === '1',
      schedule: fields.get('schedule') ?? null,
      scheduleTimezone: fields.get('schedule_tz') ?? null,
      targetType: fields.get('target_type') ?? null,
      targetCount: extractTargetCount(html),
    },
    links: extractPageLinks(html),
  };
}

export function parseTelegramAdsAdStatsPage(accountToken: string, adId: string, html: string): TelegramAdsAdStatsPage {
  const normalizedAdId = normalizeAdId(adId);
  const reportPattern = new RegExp(`^/reports/account/${escapeRegExp(accountToken)}/ad/${escapeRegExp(normalizedAdId)}\\?month=\\d{6}$`);
  const links = extractPageLinks(html);

  return {
    adId: normalizedAdId,
    title: extractPageTitle(html),
    reportLinks: links.filter((link) => reportPattern.test(link.href)),
    shareStatsPath: links.find((link) => link.href === `/account/ad/${normalizedAdId}/stats/share`)?.href ?? null,
    rows: extractTableRowTexts(html),
    links,
  };
}

export function parseTelegramAdsAccountBudgetPage(html: string, offset: number | null = null, limit: number | null = null): TelegramAdsAccountBudgetPage {
  const links = extractPageLinks(html);
  const transactions = extractTableRowTexts(html)
    .map(parseBudgetTransactionRow)
    .filter((row): row is NonNullable<ReturnType<typeof parseBudgetTransactionRow>> => row !== null);

  return {
    offset,
    limit,
    balanceMicros: extractBalanceMicros(links),
    transactions,
    pagination: links.filter((link) => /^\/account\/budget\?offset=\d+&limit=\d+$/.test(link.href)),
    links,
  };
}

export function parseTelegramAdsAccountEditPage(html: string): TelegramAdsAccountEditPage {
  const form = extractRequiredForm(html, /account-edit-form/);
  const fields = indexFormFields(form);

  return {
    form,
    fields: {
      fullName: fields.get('full_name') ?? null,
      email: fields.get('email') ?? null,
      phoneNumber: fields.get('phone_number') ?? null,
      country: fields.get('country') ?? null,
      city: fields.get('city') ?? null,
      adInfo: fields.get('ad_info') ?? null,
    },
    links: extractPageLinks(html),
  };
}

export function parseTelegramAdsAdBudgetPage(adId: string, html: string): TelegramAdsAdBudgetPage {
  const normalizedAdId = normalizeAdId(adId);
  const form = extractRequiredForm(html, /pr-form/);
  const fields = indexFormFields(form);

  return {
    adId: normalizedAdId,
    title: extractPageTitle(html),
    form,
    fields: {
      ownerId: fields.get('owner_id') ?? null,
      adId: fields.get('ad_id') ?? null,
      amountMicros: parseOptionalTonMicros(fields.get('amount')),
      decreaseAmountMicros: parseOptionalTonMicros(fields.get('decr_amount')),
    },
    links: extractPageLinks(html),
  };
}

export function parseTelegramAdsAdEditPage(adId: string, section: TelegramAdsAdEditSection, html: string): TelegramAdsAdEditPage {
  const normalizedAdId = normalizeAdId(adId);
  const form = extractRequiredForm(html, /pr-popup-edit-form|js-ad-form/);

  return {
    adId: normalizedAdId,
    section,
    title: extractPageTitle(html),
    form,
    fields: indexFormSnapshotFields(form),
    links: extractPageLinks(html),
  };
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

function extractRequiredForm(html: string, classPattern: RegExp): TelegramAdsHtmlForm {
  const forms = extractForms(html);
  const form = forms.find((candidate) => candidate.className && classPattern.test(candidate.className));
  if (!form) {
    throw new TelegramAdsParseError(`Telegram Ads page did not contain expected form ${classPattern.source}`);
  }
  return form;
}

function extractForms(html: string): TelegramAdsHtmlForm[] {
  return [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map((match) => parseForm(match[0]));
}

function parseForm(formHtml: string): TelegramAdsHtmlForm {
  const openTag = formHtml.match(/^<form\b[^>]*>/i)?.[0] ?? '';
  return {
    className: readAttribute(openTag, 'class'),
    method: readAttribute(openTag, 'method')?.toLowerCase() ?? 'get',
    action: readAttribute(openTag, 'action'),
    inputs: extractFormInputs(formHtml),
    buttons: extractFormButtons(formHtml),
  };
}

function extractFormInputs(formHtml: string): TelegramAdsHtmlFormInput[] {
  const inputs: TelegramAdsHtmlFormInput[] = [];
  for (const match of formHtml.matchAll(/<(input|textarea|select)\b[^>]*>(?:[\s\S]*?<\/\1>)?/gi)) {
    const tagHtml = match[0];
    const tagName = match[1]?.toLowerCase() as TelegramAdsHtmlFormInput['tagName'] | undefined;
    if (!tagName) continue;

    const rawValue = readAttribute(tagHtml, 'value');
    const textValue = tagName === 'textarea' ? normalizeHtmlText(tagHtml) : null;
    inputs.push({
      tagName,
      name: readAttribute(tagHtml, 'name'),
      type: readAttribute(tagHtml, 'type')?.toLowerCase() ?? null,
      value: rawValue ?? textValue,
      placeholder: readAttribute(tagHtml, 'placeholder'),
      checked: /\bchecked(?:\s*=\s*["'][^"']*["'])?/i.test(tagHtml),
    });
  }
  return inputs;
}

function extractFormButtons(formHtml: string): TelegramAdsHtmlFormButton[] {
  return [...formHtml.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/gi)].map((match) => {
    const buttonHtml = match[0];
    return {
      type: readAttribute(buttonHtml, 'type'),
      text: normalizeHtmlText(buttonHtml),
    };
  });
}

function indexFormFields(form: TelegramAdsHtmlForm): Map<string, string | null> {
  const fields = new Map<string, string | null>();
  for (const input of form.inputs) {
    if (!input.name) continue;
    if ((input.type === 'radio' || input.type === 'checkbox') && !input.checked) {
      if (!fields.has(input.name)) fields.set(input.name, null);
      continue;
    }
    fields.set(input.name, input.value);
  }
  return fields;
}

function indexFormSnapshotFields(form: TelegramAdsHtmlForm): Record<string, string | boolean | null> {
  const fields: Record<string, string | boolean | null> = {};
  for (const input of form.inputs) {
    if (!input.name) continue;
    if (input.type === 'radio' || input.type === 'checkbox') {
      fields[input.name] = Boolean(fields[input.name]) || input.checked;
    } else {
      fields[input.name] = input.value;
    }
  }
  return fields;
}

function extractPageLinks(html: string): TelegramAdsPageLink[] {
  const links: TelegramAdsPageLink[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href=(["'])([\s\S]*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = decodeHtmlEntities(match[2] ?? '').trim();
    if (!href.startsWith('/account') && !href.startsWith('/reports')) continue;

    const text = normalizeHtmlText(match[3] ?? '');
    const key = `${href}\n${text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ href, text });
  }
  return links;
}

function extractTableRowTexts(html: string): string[] {
  return [...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)]
    .map((match) => normalizeHtmlText(match[0]))
    .filter(Boolean);
}

function extractPageTitle(html: string): string {
  const title = normalizeHtmlText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  return title.replace(/\s+\u2013\s+Telegram Ads$/i, '').replace(/\s+-\s+Telegram Ads$/i, '') || 'Telegram Ads';
}

function extractTargetCount(html: string): number | null {
  const selectedTargets = [...html.matchAll(/\bdata-val=(["'])([\s\S]*?)\1/gi)].length;
  if (selectedTargets > 0) return selectedTargets;

  const text = normalizeHtmlText(html);
  const match = text.match(/\b(\d+)\s+channels\b/i);
  return match?.[1] ? Number(match[1]) : null;
}

function extractBalanceMicros(links: TelegramAdsPageLink[]): number | null {
  for (const link of links) {
    if (link.href !== '/account/budget') continue;
    const amount = parseMoneyFromText(link.text);
    if (amount !== null) return amount;
  }
  return null;
}

function parseBudgetTransactionRow(text: string): TelegramAdsBudgetTransactionRow | null {
  const amount = parseMoneyFromText(text);
  if (amount === null) return null;

  const direction = /\+\s*\u{1f48e}|\+\s*TON|\+\s*\d/iu.test(text) ? 'credit' : 'debit';
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const dateMatch = normalizedText.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+at\s+\d{1,2}:\d{2}\b/i);
  const amountMatch = normalizedText.match(/[+-]\s*(?:(?:\u{1f48e}|TON)\s*)?\d[\d\s,.]*/iu);
  const description = amountMatch ? normalizedText.slice(0, amountMatch.index).trim() : normalizedText;

  return {
    description,
    amountMicros: amount,
    direction,
    occurredAtText: dateMatch?.[0] ?? null,
  };
}

function parseMoneyFromText(text: string): number | null {
  const normalized = text.replace(/\s+/g, ' ');
  const symbolMatch = normalized.match(/\u{1f48e}\s*([0-9][0-9\s,.]*)/u);
  const tonMatch = normalized.match(/\bTON\s*([0-9][0-9\s,.]*)/i);
  const amountText = symbolMatch?.[1] ?? tonMatch?.[1] ?? null;
  if (!amountText) return null;

  const compact = amountText.replace(/\s+/g, '');
  if (!/\d/.test(compact)) return null;
  return parseTonMicros(compact);
}

function parseOptionalTonMicros(value: string | null | undefined): number | null {
  if (!value) return null;
  return parseTonMicros(value);
}

function parseOptionalInteger(value: string | null | undefined): number | null {
  if (!value) return null;
  return parseNonNegativeInteger(value);
}

function parseOptionalBoolean(value: string | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  if (value === '1' || /^true$/i.test(value)) return true;
  if (value === '0' || /^false$/i.test(value)) return false;
  return null;
}

function readAttribute(tagHtml: string, name: string): string | null {
  const match = tagHtml.match(new RegExp(`\\b${escapeRegExp(name)}=(["'])([\\s\\S]*?)\\1`, 'i'));
  return match?.[2] ? decodeHtmlEntities(match[2]) : null;
}

function compareAccountHourlyRows(
  left: Pick<TelegramAdsAccountHourlyRow, 'bucketStartUtc'>,
  right: Pick<TelegramAdsAccountHourlyRow, 'bucketStartUtc'>,
): number {
  return left.bucketStartUtc.localeCompare(right.bucketStartUtc);
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
