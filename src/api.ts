import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';
import { createTelegramAdsClient } from './client.js';
import {
  TelegramAdsError,
  TelegramAdsHttpError,
  TelegramAdsParseError,
  TelegramAdsValidationError,
} from './errors.js';
import {
  normalizeAccountToken,
  normalizeAdEditSection,
  normalizeAdId,
  normalizeNonNegativeIntegerInput,
  normalizePositiveIntegerInput,
  normalizeStatMonth,
  requireText,
} from './internal.js';
import type { TelegramAdsClient, TelegramAdsFetch } from './types.js';

export type TelegramAdsApiServerOptions = {
  cookie: string;
  apiToken: string;
  baseUrl?: string | URL;
  fetch?: TelegramAdsFetch;
  logger?: FastifyServerOptions['logger'];
};

type AccountParams = {
  accountToken: string;
};

type AccountAdParams = AccountParams & {
  adId: string;
};

type MonthQuery = {
  month?: string;
};

type PaginationQuery = {
  offset?: string;
  limit?: string;
};

type EditParams = AccountAdParams & {
  section: string;
};

export function createTelegramAdsApiServer(options: TelegramAdsApiServerOptions): FastifyInstance {
  const apiToken = requireText(options.apiToken, 'apiToken');
  const client = createTelegramAdsClient({
    cookie: options.cookie,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const app = Fastify({
    logger: options.logger ?? false,
  });

  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return;

    const bearerToken = readBearerToken(request.headers.authorization);
    if (bearerToken !== apiToken) {
      await reply.code(401).send({
        ok: false,
        error: {
          name: 'Unauthorized',
          message: 'Missing or invalid bearer token',
        },
      });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    sendError(reply, error);
  });

  registerRoutes(app, client);

  return app;
}

function registerRoutes(app: FastifyInstance, client: TelegramAdsClient): void {
  app.get('/health', async () => ({
    ok: true,
    service: 'tg-ads-kit',
  }));

  app.get<{ Params: AccountParams }>('/v1/accounts/:accountToken/daily', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    return ok({
      rows: await client.fetchAccountDailyRows(accountToken),
    });
  });

  app.get<{ Params: AccountParams }>('/v1/accounts/:accountToken/hourly', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    return ok({
      rows: await client.fetchAccountHourlyRows(accountToken),
    });
  });

  app.get<{ Params: AccountParams; Querystring: MonthQuery }>(
    '/v1/accounts/:accountToken/monthly',
    async (request) => {
      const accountToken = normalizeAccountToken(request.params.accountToken);
      const month = normalizeStatMonth(readRequiredQuery(request.query.month, 'month'));
      return ok({
        month,
        rows: await client.fetchMonthlyReport(accountToken, month),
      });
    },
  );

  app.get('/v1/session/ads', async () => ok({
    rows: await client.fetchAccountAds(),
  }));

  app.get<{ Querystring: PaginationQuery }>('/v1/session/account/budget', async (request) => {
    const offset = request.query.offset === undefined ? undefined : normalizeNonNegativeIntegerInput(request.query.offset, 'offset');
    const limit = request.query.limit === undefined ? undefined : normalizePositiveIntegerInput(request.query.limit, 'limit');
    return ok(await client.fetchAccountBudgetPage(offset, limit));
  });

  app.get<{ Params: AccountParams }>('/v1/accounts/:accountToken/stats-page', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    return ok(await client.fetchAccountStatsPage(accountToken));
  });

  app.get('/v1/session/account/edit', async () => ok(await client.fetchAccountEditPage()));

  app.get<{ Params: AccountAdParams }>('/v1/accounts/:accountToken/ads/:adId/detail', async (request) => {
    normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    return ok(await client.fetchAdDetail(adId));
  });

  app.get<{ Params: AccountAdParams }>('/v1/accounts/:accountToken/ads/:adId/stats-page', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    return ok(await client.fetchAdStatsPage(accountToken, adId));
  });

  app.get<{ Params: AccountAdParams }>('/v1/accounts/:accountToken/ads/:adId/share-stats-page', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    return ok(await client.fetchAdShareStatsPage(accountToken, adId));
  });

  app.get<{ Params: AccountAdParams }>('/v1/accounts/:accountToken/ads/:adId/budget-page', async (request) => {
    normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    return ok(await client.fetchAdBudgetPage(adId));
  });

  app.get<{ Params: EditParams }>('/v1/accounts/:accountToken/ads/:adId/edit/:section', async (request) => {
    normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    const section = normalizeAdEditSection(request.params.section);
    return ok(await client.fetchAdEditPage(adId, section));
  });

  app.get<{ Params: AccountAdParams; Querystring: MonthQuery }>(
    '/v1/accounts/:accountToken/ads/:adId/daily',
    async (request) => {
      const accountToken = normalizeAccountToken(request.params.accountToken);
      const adId = normalizeAdId(request.params.adId);
      const month = normalizeStatMonth(readRequiredQuery(request.query.month, 'month'));
      return ok({
        month,
        adId,
        rows: await client.fetchAdDailyRows(accountToken, adId, month),
      });
    },
  );

  app.get<{ Params: AccountAdParams }>('/v1/accounts/:accountToken/ads/:adId/hourly', async (request) => {
    const accountToken = normalizeAccountToken(request.params.accountToken);
    const adId = normalizeAdId(request.params.adId);
    return ok({
      adId,
      rows: await client.fetchAdHourlyRows(accountToken, adId),
    });
  });

  app.get<{ Params: AccountParams; Querystring: MonthQuery }>(
    '/v1/accounts/:accountToken/snapshot',
    async (request) => {
      const accountToken = normalizeAccountToken(request.params.accountToken);
      const month = normalizeStatMonth(readRequiredQuery(request.query.month, 'month'));
      const [dailyRows, monthlyRows, ads] = await Promise.all([
        client.fetchAccountDailyRows(accountToken),
        client.fetchMonthlyReport(accountToken, month),
        client.fetchAccountAds(),
      ]);

      return ok({
        month,
        dailyRows,
        monthlyRows,
        ads,
      });
    },
  );
}

function ok<T>(data: T): { ok: true; data: T } {
  return {
    ok: true,
    data,
  };
}

function readRequiredQuery(value: unknown, fieldName: string): string {
  return requireText(value, fieldName);
}

function readBearerToken(value: FastifyRequest['headers']['authorization']): string | null {
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function sendError(reply: FastifyReply, error: unknown): void {
  if (error instanceof TelegramAdsHttpError) {
    void reply.code(502).send({
      ok: false,
      error: {
        name: error.name,
        message: error.message,
        upstreamStatus: error.status,
      },
    });
    return;
  }

  if (error instanceof TelegramAdsParseError || error instanceof TelegramAdsValidationError) {
    void reply.code(400).send({
      ok: false,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof TelegramAdsError) {
    void reply.code(500).send({
      ok: false,
      error: {
        name: error.name,
        message: error.message,
      },
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  void reply.code(500).send({
    ok: false,
    error: {
      name: 'InternalServerError',
      message,
    },
  });
}
