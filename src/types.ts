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
  fetchAccountFiveMinuteStatsCsv(accountToken: string): Promise<string>;
  fetchAccountFiveMinuteBudgetCsv(accountToken: string): Promise<string>;
  fetchAccountHourlyRows(accountToken: string): Promise<TelegramAdsAccountHourlyRow[]>;
  fetchMonthlyReportCsv(accountToken: string, statMonth: string): Promise<string>;
  fetchMonthlyReport(accountToken: string, statMonth: string): Promise<TelegramAdsAdMonthlyRow[]>;
  fetchAccountAdsHtml(): Promise<string>;
  fetchAccountAds(): Promise<TelegramAdsAdMetadataRow[]>;
  fetchAccountBudgetHtml(offset?: number, limit?: number): Promise<string>;
  fetchAccountBudgetPage(offset?: number, limit?: number): Promise<TelegramAdsAccountBudgetPage>;
  fetchAccountEditHtml(): Promise<string>;
  fetchAccountEditPage(): Promise<TelegramAdsAccountEditPage>;
  fetchAdDetailHtml(adId: string): Promise<string>;
  fetchAdDetail(adId: string): Promise<TelegramAdsAdDetailPage>;
  fetchAdStatsHtml(accountToken: string, adId: string): Promise<string>;
  fetchAdStatsPage(accountToken: string, adId: string): Promise<TelegramAdsAdStatsPage>;
  fetchAdBudgetHtml(adId: string): Promise<string>;
  fetchAdBudgetPage(adId: string): Promise<TelegramAdsAdBudgetPage>;
  fetchAdEditHtml(adId: string, section: TelegramAdsAdEditSection): Promise<string>;
  fetchAdEditPage(adId: string, section: TelegramAdsAdEditSection): Promise<TelegramAdsAdEditPage>;
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

export type TelegramAdsAccountFiveMinuteStatsRow = {
  bucketStartUtc: string;
  statDate: string;
  statHour: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type TelegramAdsAccountFiveMinuteBudgetRow = {
  bucketStartUtc: string;
  statDate: string;
  statHour: number;
  costMicros: number;
};

export type TelegramAdsAccountHourlyStatsRow = TelegramAdsAccountFiveMinuteStatsRow;

export type TelegramAdsAccountHourlyBudgetRow = TelegramAdsAccountFiveMinuteBudgetRow;

export type TelegramAdsAccountHourlyRow = TelegramAdsAccountHourlyStatsRow & {
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

export type TelegramAdsHtmlFormInput = {
  tagName: 'input' | 'textarea' | 'select';
  name: string | null;
  type: string | null;
  value: string | null;
  placeholder: string | null;
  checked: boolean;
};

export type TelegramAdsHtmlFormButton = {
  type: string | null;
  text: string;
};

export type TelegramAdsHtmlForm = {
  className: string | null;
  method: string;
  action: string | null;
  inputs: TelegramAdsHtmlFormInput[];
  buttons: TelegramAdsHtmlFormButton[];
};

export type TelegramAdsPageLink = {
  href: string;
  text: string;
};

export type TelegramAdsAdEditSection = 'cpm' | 'budget' | 'status';

export type TelegramAdsAdDetailPage = {
  adId: string;
  title: string;
  form: TelegramAdsHtmlForm;
  fields: {
    title: string | null;
    text: string | null;
    promoteUrl: string | null;
    websiteName: string | null;
    cpmMicros: number | null;
    dailyBudgetMicros: number | null;
    viewsPerUser: number | null;
    active: boolean | null;
    activateDate: string | null;
    activateTime: string | null;
    deactivateDate: string | null;
    deactivateTime: string | null;
    usesSchedule: boolean;
    schedule: string | null;
    scheduleTimezone: string | null;
    targetType: string | null;
    targetCount: number | null;
  };
  links: TelegramAdsPageLink[];
};

export type TelegramAdsAdStatsPage = {
  adId: string;
  title: string;
  reportLinks: TelegramAdsPageLink[];
  shareStatsPath: string | null;
  rows: string[];
  links: TelegramAdsPageLink[];
};

export type TelegramAdsBudgetTransactionRow = {
  description: string;
  amountMicros: number;
  direction: 'credit' | 'debit';
  occurredAtText: string | null;
};

export type TelegramAdsAccountBudgetPage = {
  offset: number | null;
  limit: number | null;
  balanceMicros: number | null;
  transactions: TelegramAdsBudgetTransactionRow[];
  pagination: TelegramAdsPageLink[];
  links: TelegramAdsPageLink[];
};

export type TelegramAdsAccountEditPage = {
  form: TelegramAdsHtmlForm;
  fields: {
    fullName: string | null;
    email: string | null;
    phoneNumber: string | null;
    country: string | null;
    city: string | null;
    adInfo: string | null;
  };
  links: TelegramAdsPageLink[];
};

export type TelegramAdsAdBudgetPage = {
  adId: string;
  title: string;
  form: TelegramAdsHtmlForm;
  fields: {
    ownerId: string | null;
    adId: string | null;
    amountMicros: number | null;
    decreaseAmountMicros: number | null;
  };
  links: TelegramAdsPageLink[];
};

export type TelegramAdsAdEditPage = {
  adId: string;
  section: TelegramAdsAdEditSection;
  title: string;
  form: TelegramAdsHtmlForm;
  fields: Record<string, string | boolean | null>;
  links: TelegramAdsPageLink[];
};
