import { Router } from 'express';
import type { CountriesService } from '../services/countries-service.js';
import { parseCountryCode } from '../middleware/validation.js';

// GET /countries/:code
// Express 5 forwards rejected promises from async handlers to the error handler
export function countriesRouter(service: CountriesService): Router {
  const router = Router();

  router.get('/:code', async (req, res) => {
    const code = parseCountryCode(req.params.code, 'code');
    res.json(await service.getCountry(code));
  });

  return router;
}
