import { Router } from 'express';
import type { CountriesSource } from '../domain/countries-source.js';

// GET /health
// Always answers 200 while this API is alive; `source` tells whether the
// provider responds. When it doesn't, status is "degraded" (not an HTTP error),
// so liveness probes don't restart a healthy process because of a vendor outage.
export function healthRouter(source: CountriesSource): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const sourceUp = await source.ping().then(
      () => true,
      () => false,
    );

    res.json({
      status: sourceUp ? 'ok' : 'degraded',
      source: sourceUp ? 'up' : 'down',
    });
  });

  return router;
}
