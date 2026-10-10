import { Router } from 'express';
import type { CountriesService } from '../services/countries-service.js';
import { parseCountryCode } from '../middleware/validation.js';

// GET /routes?from=GTM&to=PAN
export function landRoutesRouter(service: CountriesService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const from = parseCountryCode(req.query['from'], 'from');
    const to = parseCountryCode(req.query['to'], 'to');
    res.json(await service.getRoute(from, to));
  });

  return router;
}
