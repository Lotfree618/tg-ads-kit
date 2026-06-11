import { TelegramAdsValidationError } from './errors.js';
import { normalizeCookieHeader, requireText } from './internal.js';

export type TelegramAdsApiRuntimeConfig = {
  cookie: string;
  apiToken: string;
  host: string;
  port: number;
  baseUrl?: string;
};

export type TelegramAdsClientRuntimeConfig = {
  cookie: string;
  baseUrl?: string;
};

export function loadTelegramAdsClientConfig(env: NodeJS.ProcessEnv = process.env): TelegramAdsClientRuntimeConfig {
  const cookie = normalizeCookieHeader(readRequiredEnv(env, 'TELEGRAM_ADS_COOKIE'), 'TELEGRAM_ADS_COOKIE');
  const baseUrl = env.TELEGRAM_ADS_BASE_URL?.trim();

  return {
    cookie,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

export function loadTelegramAdsApiConfig(env: NodeJS.ProcessEnv = process.env): TelegramAdsApiRuntimeConfig {
  const cookie = normalizeCookieHeader(readRequiredEnv(env, 'TELEGRAM_ADS_COOKIE'), 'TELEGRAM_ADS_COOKIE');
  const apiToken = readRequiredEnv(env, 'TG_ADS_API_TOKEN');
  const host = env.HOST?.trim() || '127.0.0.1';
  const port = parsePort(env.PORT?.trim() || '3000');
  const baseUrl = env.TELEGRAM_ADS_BASE_URL?.trim();

  return {
    cookie,
    apiToken,
    host,
    port,
    ...(baseUrl ? { baseUrl } : {}),
  };
}

function readRequiredEnv(env: NodeJS.ProcessEnv, name: string): string {
  return requireText(env[name], name);
}

function parsePort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new TelegramAdsValidationError('PORT must be an integer between 1 and 65535');
  }
  return port;
}
