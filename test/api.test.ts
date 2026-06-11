import { createTelegramAdsApiServer } from '../src/api.js';

describe('Telegram Ads API server', () => {
  it('serves health without auth', async () => {
    const app = createTelegramAdsApiServer({
      apiToken: 'test-token',
      cookie: 'stel_adowner=owner',
      fetch: vi.fn() as unknown as typeof fetch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      service: 'tg-ads-kit',
    });
  });

  it('requires bearer auth for data routes', async () => {
    const app = createTelegramAdsApiServer({
      apiToken: 'test-token',
      cookie: 'stel_adowner=owner',
      fetch: vi.fn() as unknown as typeof fetch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/accounts/tg_account_token_1234/daily',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      ok: false,
      error: {
        name: 'Unauthorized',
      },
    });
  });

  it('pulls Telegram Ads account daily rows through mocked upstream endpoints', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname === '/csv' && url.searchParams.get('prefix') === 'account/tg_account_token_1234') {
        return textResponse('date\tViews\tClicks\tActions\n16 Jan 2026\t1000\t25\t3\n');
      }
      if (url.pathname === '/csv' && url.searchParams.get('prefix') === 'account/tg_account_token_1234/budget') {
        return textResponse('date\tSpent budget, TON\n16 Jan 2026\t1.23456\n');
      }
      return textResponse('not found', 404);
    });
    const app = createTelegramAdsApiServer({
      apiToken: 'test-token',
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/accounts/tg_account_token_1234/daily',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      data: {
        rows: [
          {
            statDate: '2026-01-16',
            impressions: 1000,
            clicks: 25,
            costMicros: 1_234_560,
            conversions: 3,
          },
        ],
      },
    });
  });

  it('returns upstream failures as gateway errors without leaking full response bodies', async () => {
    const fetcher = vi.fn(async () => textResponse('expired session with long private details', 403));
    const app = createTelegramAdsApiServer({
      apiToken: 'test-token',
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/accounts/tg_account_token_1234/daily',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toMatchObject({
      ok: false,
      error: {
        name: 'TelegramAdsHttpError',
        upstreamStatus: 403,
      },
    });
  });

  it('serves GET-only ad detail page snapshots', async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(init?.method).toBeUndefined();
      if (url.pathname === '/account/ad/205') {
        return textResponse(`
          <title>Nange3 - Telegram Ads</title>
          <form class="js-ad-form">
            <input name="title" value="Nange3">
            <input name="cpm" value="0.30">
          </form>
        `);
      }
      return textResponse('not found', 404);
    });
    const app = createTelegramAdsApiServer({
      apiToken: 'test-token',
      cookie: 'stel_adowner=owner',
      fetch: fetcher as typeof fetch,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/accounts/tg_account_token_1234/ads/205/detail',
      headers: {
        authorization: 'Bearer test-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      data: {
        adId: '205',
        title: 'Nange3',
        fields: {
          title: 'Nange3',
          cpmMicros: 300_000,
        },
      },
    });
  });
});

function textResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}
