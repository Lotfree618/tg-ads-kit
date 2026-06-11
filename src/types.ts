export const TELEGRAM_ADS_STATUSES = [
  'Active',
  'On Hold',
  'Stopped',
  'In Review',
  'Declined',
] as const;

export type TelegramAdsStatus = (typeof TELEGRAM_ADS_STATUSES)[number];

export type TelegramAdsFetch = typeof fetch;

export type TelegramAdsClientOptions = {
  cookie: string;
  baseUrl?: string | URL;
  fetch?: TelegramAdsFetch;
  headers?: HeadersInit;
  userAgent?: string;
};

export type TelegramAdsClient = {
  getText(path: string, accept: string): Promise<string>;
  fetchAccountDailyStatsCsv(accountToken: string): Promise<string>;
  fetchAccountDailyBudgetCsv(accountToken: string): Promise<string>;
  fetchAccountDailyRows(accountToken: string): Promise<TelegramAdsAccountDailyRow[]>;
  fetchMonthlyReportCsv(accountToken: string, statMonth: string): Promise<string>;
  fetchMonthlyReport(accountToken: string, statMonth: string): Promise<TelegramAdsAdMonthlyRow[]>;
  fetchAccountAdsHtml(): Promise<string>;
  fetchAccountAds(): Promise<TelegramAdsAdMetadataRow[]>;
  fetchAdDailyReportCsv(accountToken: string, adId: string, statMonth: string): Promise<string>;
  fetchAdDailyStatsCsv(accountToken: string, adId: string): Promise<string>;
  fetchAdDailyRows(accountToken: string, adId: string, statMonth: string): Promise<TelegramAdsAdDailyRow[]>;
  fetchAdFiveMinuteStatsCsv(accountToken: string, adId: string): Promise<string>;
  fetchAdFiveMinuteBudgetCsv(accountToken: string, adId: string): Promise<string>;
  fetchAdHourlyRows(accountToken: string, adId: string): Promise<TelegramAdsAdHourlyRow[]>;
};

export type TelegramAdsAccountDailyStatsRow = {
  statDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type TelegramAdsAccountDailyBudgetRow = {
  statDate: string;
  costMicros: number;
};

export type TelegramAdsAccountDailyRow = TelegramAdsAccountDailyStatsRow & {
  costMicros: number;
};

export type TelegramAdsAdMonthlyRow = {
  statMonth: string;
  adId: string;
  adTitle: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  conversions: number;
};

export type TelegramAdsAdDailyStatsRow = {
  adId: string;
  statDate: string;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type TelegramAdsAdDailyReportRow = {
  adId: string;
  statDate: string;
  impressions: number;
  costMicros: number;
};

export type TelegramAdsAdDailyRow = TelegramAdsAdDailyStatsRow & {
  costMicros: number;
};

export type TelegramAdsAdFiveMinuteStatsRow = {
  adId: string;
  bucketStartUtc: string;
  statDate: string;
  statHour: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type TelegramAdsAdFiveMinuteBudgetRow = {
  adId: string;
  bucketStartUtc: string;
  statDate: string;
  statHour: number;
  costMicros: number;
};

export type TelegramAdsAdHourlyStatsRow = TelegramAdsAdFiveMinuteStatsRow;

export type TelegramAdsAdHourlyBudgetRow = TelegramAdsAdFiveMinuteBudgetRow;

export type TelegramAdsAdHourlyRow = TelegramAdsAdHourlyStatsRow & {
  costMicros: number;
};

export type TelegramAdsAdMetadataRow = {
  adId: string;
  adTitle: string;
  adStatus: TelegramAdsStatus | null;
  cpmMicros: number | null;
  currentBudgetMicros: number | null;
};

