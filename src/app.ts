import express, { type Express } from 'express';
import type { CountriesSource } from './domain/countries-source.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { countriesRouter } from './routes/countries.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { landRoutesRouter } from './routes/land-routes.routes.js';
import { regionsRouter } from './routes/regions.routes.js';
import type { CountriesService } from './services/countries-service.js';

export interface AppDependencies {
  readonly service: CountriesService;
  // Used by /health to probe the provider directly (bypassing the cache)
  readonly source: CountriesSource;
}

// App factory: keeps the app free of side effects (no listen, no env reads)
// so integration tests can build it with a fake upstream source.
export function createApp({ service, source }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use('/countries', countriesRouter(service));
  app.use('/routes', landRoutesRouter(service));
  app.use('/regions', regionsRouter(service));
  app.use('/health', healthRouter(source));

  // Order matters: unmatched URLs first, then the single place that formats errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
