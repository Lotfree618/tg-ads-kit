import { TelegramAdsParseError, TelegramAdsValidationError } from './errors.js';

export const TELEGRAM_ADS_BASE_URL = 'https://ads.telegram.org';
export const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

const TELEGRAM_ADS_MONTHS: Record<string, string> = {
  jan: '01',
  january: '01',
  feb: '02',
  february: '02',
  mar: '03',
  march: '03',
  apr: '04',
  april: '04',
  may: '05',
  jun: '06',
  june: '06',
  jul: '07',
  july: '07',
  aug: '08',
  august: '08',
  sep: '09',
  september: '09',
  oct: '10',
  october: '10',
  nov: '11',
  november: '11',
  dec: '12',
  december: '12',
};

export function normalizeAccountToken(value: unknown, fieldName = 'accountToken'): string {
  const text = requireText(value, fieldName);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(text)) {
    throw new TelegramAdsValidationError(`${fieldName} format is invalid`);
  }
  return text;
}

export function normalizeAdId(value: unknown, fieldName = 'adId'): string {
  const text = requireText(value, fieldName);
  const prefixedMatch = text.match(/^AD0*(\d+)$/i);
  const normalized = prefixedMatch?.[1] ?? text;
  if (!/^\d{1,32}$/.test(normalized)) {
    throw new TelegramAdsValidationError(`${fieldName} format is invalid`);
  }
  return normalized;
}

export function normalizeOptionalAdId(value: unknown): string | null {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const prefixedMatch = text.match(/^AD0*(\d+)$/i);
  const normalized = prefixedMatch?.[1] ?? text;
  return /^\d{1,32}$/.test(normalized) ? normalized : null;
}

export function normalizeStatMonth(value: unknown, fieldName = 'statMonth'): string {
  const text = requireText(value, fieldName);
  if (!/^\d{6}$/.test(text)) {
    throw new TelegramAdsValidationError(`${fieldName} must be in YYYYMM format`);
  }
  const month = Number(text.slice(4, 6));
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new TelegramAdsValidationError(`${fieldName} must contain a valid month`);
  }
  return text;
}

export function normalizeCookieHeader(value: unknown, fieldName = 'cookie'): string {
  const cookie = requireText(value, fieldName);
  if (!cookie.includes('stel_')) {
    throw new TelegramAdsValidationError(`${fieldName} does not look like an ads.telegram.org cookie header`);
  }
  return cookie;
}

export function normalizeAdEditSection(value: unknown, fieldName = 'section'): 'cpm' | 'budget' | 'status' {
  const text = requireText(value, fieldName);
  if (text === 'cpm' || text === 'budget' || text === 'status') {
    return text;
  }
  throw new TelegramAdsValidationError(`${fieldName} must be one of cpm, budget, status`);
}

export function normalizeNonNegativeIntegerInput(value: unknown, fieldName: string): number {
  const text = requireText(value, fieldName);
  if (!/^\d+$/.test(text)) {
    throw new TelegramAdsValidationError(`${fieldName} must be a non-negative integer`);
  }
  return Number(text);
}

export function normalizePositiveIntegerInput(value: unknown, fieldName: string): number {
  const parsed = normalizeNonNegativeIntegerInput(value, fieldName);
  if (parsed < 1) {
    throw new TelegramAdsValidationError(`${fieldName} must be a positive integer`);
  }
  return parsed;
}

export function parseDelimitedRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const headerLine = lines[0];
  if (headerLine === undefined) {
    return [];
  }

  const delimiter = headerLine.includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(headerLine, delimiter);
  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuote && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuote = !inQuote;
      }
    } else if (char === delimiter && !inQuote) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function normalizeTelegramDate(value: string): string {
  const text = requireText(value, 'date');
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return text;

  const slashMatch = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
  if (slashMatch) {
    const year = slashMatch[3];
    const month = slashMatch[2];
    const day = slashMatch[1];
    if (year === undefined || month === undefined || day === undefined) {
      throw new TelegramAdsParseError(`Unsupported Telegram Ads date ${text}`);
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const englishMonthMatch = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (englishMonthMatch) {
    const day = englishMonthMatch[1];
    const monthName = englishMonthMatch[2];
    const year = englishMonthMatch[3];
    if (day === undefined || monthName === undefined || year === undefined) {
      throw new TelegramAdsParseError(`Unsupported Telegram Ads date ${text}`);
    }
    const month = TELEGRAM_ADS_MONTHS[monthName.toLowerCase()];
    if (!month) {
      throw new TelegramAdsParseError(`Unsupported Telegram Ads date ${text}`);
    }
    return `${year}-${month}-${day.padStart(2, '0')}`;
  }

  throw new TelegramAdsParseError(`Unsupported Telegram Ads date ${text}`);
}

export function normalizeTelegramDateTimeUtc(value: string): {
  bucketStartUtc: string;
  statDate: string;
  statHour: number;
} {
  const text = requireText(value, 'date');
  const match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s+UTC$/);
  if (!match) {
    throw new TelegramAdsParseError(`Unsupported Telegram Ads UTC datetime ${text}`);
  }

  const day = match[1];
  const monthName = match[2];
  const year = match[3];
  const hourText = match[4];
  const minuteText = match[5];
  if (
    day === undefined ||
    monthName === undefined ||
    year === undefined ||
    hourText === undefined ||
    minuteText === undefined
  ) {
    throw new TelegramAdsParseError(`Unsupported Telegram Ads UTC datetime ${text}`);
  }

  const month = TELEGRAM_ADS_MONTHS[monthName.toLowerCase()];
  if (!month) {
    throw new TelegramAdsParseError(`Unsupported Telegram Ads UTC datetime ${text}`);
  }

  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new TelegramAdsParseError(`Unsupported Telegram Ads UTC datetime ${text}`);
  }

  const statDate = `${year}-${month}-${day.padStart(2, '0')}`;
  return {
    bucketStartUtc: `${statDate}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    statDate,
    statHour: hour,
  };
}

export function parseTonMicros(value: unknown): number {
  const normalized = normalizeOptionalText(value)?.replace(/\s/g, '') ?? '0';
  const decimalNormalized =
    normalized.includes(',') && !normalized.includes('.') ? normalized.replace(',', '.') : normalized.replace(/,/g, '');
  const parsed = parseNonNegativeNumber(decimalNormalized);
  return Math.round(parsed * 1_000_000);
}

export function parseNonNegativeInteger(value: unknown): number {
  return Math.round(parseNonNegativeNumber(value));
}

export function parseNonNegativeNumber(value: unknown): number {
  const normalized = normalizeOptionalText(value)?.replace(/,/g, '') ?? null;
  if (normalized === null) {
    throw new TelegramAdsParseError('Expected a non-negative number');
  }
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new TelegramAdsParseError(`Invalid non-negative number ${String(value)}`);
  }
  return parsed;
}

export function requireCsvValue(row: Record<string, string>, fieldName: string): string {
  if (!(fieldName in row)) {
    throw new TelegramAdsParseError(`Telegram Ads CSV missing column ${fieldName}`);
  }
  return row[fieldName]!;
}

export function requireText(value: unknown, fieldName: string): string {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw new TelegramAdsValidationError(`${fieldName} is required`);
  }
  return text;
}

export function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

export function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function normalizeHtmlText(value: string): string {
  return decodeHtmlEntities(stripTags(value)).replace(/\s+/g, ' ').trim();
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskTelegramAdsCsvPrefix(prefix: string | null): string {
  const text = normalizeOptionalText(prefix);
  if (!text) return '';

  const accountMatch = text.match(/^account\/[^/]+(\/budget)?$/);
  if (accountMatch) {
    return `account/{accountToken}${accountMatch[1] ?? ''}`;
  }

  const adMatch = text.match(/^ad\/[^/]+\/(\d+)(\/budget)?$/);
  if (adMatch) {
    return `ad/{accountToken}/${adMatch[1]}${adMatch[2] ?? ''}`;
  }

  return text.replace(/[A-Za-z0-9_-]{16,128}/g, '{accountToken}');
}
