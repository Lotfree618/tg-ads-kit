import 'dotenv/config';
import { createTelegramAdsApiServer } from './api.js';
import { loadTelegramAdsApiConfig } from './config.js';

const config = loadTelegramAdsApiConfig();
const app = createTelegramAdsApiServer({
  cookie: config.cookie,
  apiToken: config.apiToken,
  ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  logger: true,
});

void main();

async function main(): Promise<void> {
  try {
    await app.listen({
      host: config.host,
      port: config.port,
    });
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}
