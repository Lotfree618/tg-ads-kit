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

