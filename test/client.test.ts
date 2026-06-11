import { createTelegramAdsClient, TelegramAdsHttpError } from '../src/index.js';

describe('Telegram Ads client', () => {
  it('fetches and parses account daily rows', async () => {
    const requests: Array<{ url: string; headers: Record<string, string> }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      requests.push({
        url: url.toString(),
        headers: init?.headers as Record<string, string>,
      });

      if (url.pathname === '/csv' && url.searchParams.get('prefix') === 'account/tg_account_token_1234') {
        return textResponse('date\tViews\tClicks\tActions\n16 Jan 2026\t1000\t25\t3\n');
      }

      if (url.pathname === '/csv' && url.searchParams.get('prefix') === 'account/tg_account_token_1234/budget') {
        return textResponse('date\tSpent budget, TON\n16 Jan 2026\t1.23456\n');
      }

      return textResponse('not found', 404);
    });

    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner; stel_ssid=session; stel_token=token',
      fetch: fetcher as typeof fetch,
    });
    const rows = await client.fetchAccountDailyRows('tg_account_token_1234');

    expect(rows).toEqual([
      {
        statDate: '2026-01-16',
        impressions: 1000,
        clicks: 25,
        costMicros: 1_234_560,
        conversions: 3,
      },
    ]);
    expect(requests).toHaveLength(2);
    expect(requests[0]?.headers.cookie).toContain('stel_adowner=owner');
    expect(requests[0]?.headers.accept).toBe('text/csv');
  });

  it('masks account tokens in HTTP errors', async () => {
    const fetcher = vi.fn(async () => textResponse('expired session', 403));
    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    await expect(client.fetchAccountDailyStatsCsv('tg_account_token_1234')).rejects.toMatchObject({
      name: 'TelegramAdsHttpError',
      status: 403,
      bodyPreview: 'expired session',
    } satisfies Partial<TelegramAdsHttpError>);
    await expect(client.fetchAccountDailyStatsCsv('tg_account_token_1234')).rejects.toThrow(
      '/csv?prefix=account/{accountToken}&period=day failed with 403',
    );
  });

  it('uses Telegram Ads 5-minute CSV endpoints for hourly rows', async () => {
    const requestedPrefixes: string[] = [];
    const requestedPeriods: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      requestedPrefixes.push(url.searchParams.get('prefix') ?? '');
      requestedPeriods.push(url.searchParams.get('period') ?? '');

      if (url.searchParams.get('prefix') === 'ad/tg_account_token_1234/187') {
        return textResponse([
          'date\tViews\tClicks\tJoined',
          ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t10\t1\t0`),
        ].join('\n'));
      }

      if (url.searchParams.get('prefix') === 'ad/tg_account_token_1234/187/budget') {
        return textResponse([
          'date\tSpent budget, TON',
          ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t0.0001`),
        ].join('\n'));
      }

      return textResponse('not found', 404);
    });
    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    const rows = await client.fetchAdHourlyRows('tg_account_token_1234', '187');

    expect(requestedPrefixes).toEqual([
      'ad/tg_account_token_1234/187',
      'ad/tg_account_token_1234/187/budget',
    ]);
    expect(requestedPeriods).toEqual(['5min', '5min']);
    expect(rows).toEqual([
      {
        adId: '187',
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        impressions: 120,
        clicks: 12,
        costMicros: 1_200,
        conversions: 0,
      },
    ]);
  });

  it('uses Telegram Ads account 5-minute CSV endpoints for account hourly rows', async () => {
    const requestedPrefixes: string[] = [];
    const requestedPeriods: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      requestedPrefixes.push(url.searchParams.get('prefix') ?? '');
      requestedPeriods.push(url.searchParams.get('period') ?? '');

      if (url.searchParams.get('prefix') === 'account/tg_account_token_1234') {
        return textResponse([
          'date\tViews\tClicks\tActions',
          ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t10\t1\t0`),
        ].join('\n'));
      }

      if (url.searchParams.get('prefix') === 'account/tg_account_token_1234/budget') {
        return textResponse([
          'date\tSpent budget, TON',
          ...Array.from({ length: 12 }, (_, index) => `09 June 2026 2:${String(index * 5).padStart(2, '0')} UTC\t0.0001`),
        ].join('\n'));
      }

      return textResponse('not found', 404);
    });
    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    const rows = await client.fetchAccountHourlyRows('tg_account_token_1234');

    expect(requestedPrefixes).toEqual([
      'account/tg_account_token_1234',
      'account/tg_account_token_1234/budget',
    ]);
    expect(requestedPeriods).toEqual(['5min', '5min']);
    expect(rows).toEqual([
      {
        bucketStartUtc: '2026-06-09T02:00:00.000Z',
        statDate: '2026-06-09',
        statHour: 2,
        impressions: 120,
        clicks: 12,
        costMicros: 1_200,
        conversions: 0,
      },
    ]);
  });

  it('fetches page snapshots through GET-only page endpoints', async () => {
    const requests: Array<{ pathname: string; search: string; method: string | undefined }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      requests.push({
        pathname: url.pathname,
        search: url.search,
        method: init?.method,
      });

      if (url.pathname === '/account/budget') {
        return textResponse(`
          <a href="/account/budget">TON 19.00</a>
          <table><tr><td>Payment</td><td>+ TON 1.00</td><td>Jun 9 at 14:56</td></tr></table>
        `);
      }

      if (url.pathname === '/account/stats') {
        return textResponse('<title>Telegram Ads</title><a href="/reports/account/tg_account_token_1234?month=202606">CSV</a>');
      }

      if (url.pathname === '/account/edit') {
        return textResponse('<form class="account-edit-form"><input name="email" value="a@example.com"></form>');
      }

      if (url.pathname === '/account/ad/205') {
        return textResponse('<title>Ad - Telegram Ads</title><form class="js-ad-form"><input name="title" value="Ad"></form>');
      }

      if (url.pathname === '/account/ad/205/stats') {
        return textResponse('<title>Ad - Telegram Ads</title><a href="/reports/account/tg_account_token_1234/ad/205?month=202606">CSV</a>');
      }

      if (url.pathname === '/account/ad/205/stats/share') {
        return textResponse('<title>Ad - Telegram Ads</title><a href="/reports/account/tg_account_token_1234/ad/205?month=202606">CSV</a>');
      }

      if (url.pathname === '/account/ad/205/budget') {
        return textResponse('<title>Ad - Telegram Ads</title><form class="pr-form"><input name="ad_id" value="205"></form>');
      }

      if (url.pathname === '/account/ad/205/edit_status') {
        return textResponse('<title>Ad - Telegram Ads</title><form class="pr-popup-edit-form"><input name="ad_id" value="205"></form>');
      }

      return textResponse('not found', 404);
    });
    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    await client.fetchAccountBudgetPage(0, 5);
    await client.fetchAccountStatsPage('tg_account_token_1234');
    await client.fetchAccountEditPage();
    await client.fetchAdDetail('205');
    await client.fetchAdStatsPage('tg_account_token_1234', '205');
    await client.fetchAdShareStatsPage('tg_account_token_1234', '205');
    await client.fetchAdBudgetPage('205');
    await client.fetchAdEditPage('205', 'status');

    expect(requests).toEqual([
      { pathname: '/account/budget', search: '?offset=0&limit=5', method: undefined },
      { pathname: '/account/stats', search: '', method: undefined },
      { pathname: '/account/edit', search: '', method: undefined },
      { pathname: '/account/ad/205', search: '', method: undefined },
      { pathname: '/account/ad/205/stats', search: '', method: undefined },
      { pathname: '/account/ad/205/stats/share', search: '', method: undefined },
      { pathname: '/account/ad/205/budget', search: '', method: undefined },
      { pathname: '/account/ad/205/edit_status', search: '', method: undefined },
    ]);
  });

  it('validates the cookie and account token contract', () => {
    expect(() => createTelegramAdsClient({ cookie: 'ssid=missing-prefix' })).toThrow(
      'cookie does not look like an ads.telegram.org cookie header',
    );

    const client = createTelegramAdsClient({
      cookie: 'stel_adowner=owner',
      fetch: vi.fn() as unknown as typeof fetch,
    });
    expect(() => client.fetchAccountDailyStatsCsv('short')).rejects.toThrow('accountToken format is invalid');
  });
});

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}
