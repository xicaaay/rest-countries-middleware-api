import { Router } from 'express';
import type { CountriesService } from '../services/countries-service.js';
import { parseLimit, parseRegion, parseSortBy } from '../middleware/validation.js';

// GET /regions/:region/ranking?sortBy=density&limit=5
export function regionsRouter(service: CountriesService): Router {
  const router = Router();

  router.get('/:region/ranking', async (req, res) => {
    const region = parseRegion(req.params.region);
    const sortBy = parseSortBy(req.query['sortBy']);
    const limit = parseLimit(req.query['limit']);
    res.json(await service.getRanking(region, sortBy, limit));
  });

  return router;
}
