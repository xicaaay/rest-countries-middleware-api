import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { RestCountriesClient } from '../src/clients/restcountries.client.js';
import type { RawCountry } from '../src/clients/restcountries.types.js';
import type { Country } from '../src/domain/country.js';
import { CountriesService } from '../src/services/countries-service.js';
import { CountriesStore } from '../src/services/countries-store.js';
import { CENTRAL_AMERICA } from './fixtures.js';

// Rebuilds the provider's wire format from our fixtures, so the whole stack
// (client -> mapper -> store -> service -> routes) runs for real in these tests.
const toRaw = (c: Country): RawCountry => ({
  codes: { alpha_3: c.code },
  names: { common: c.name },
  region: c.region,
  borders: c.borders,
  population: c.population ?? 0,
  area: { kilometers: c.areaKm2 ?? 0 },
});

const providerOk = () =>
  new Response(
    JSON.stringify({ data: { objects: CENTRAL_AMERICA.map(toRaw), meta: { more: false } } }),
    { status: 200 },
  );

// Only the external provider is simulated: `fetch` is replaced by a fake
function buildApp(fetchFn: typeof fetch) {
  const source = new RestCountriesClient({
    baseUrl: 'https://provider.test/countries/v5',
    apiKey: 'test-key',
    timeoutMs: 1000,
    fetchFn,
  });
  const service = new CountriesService(new CountriesStore(source, 60_000));
  return createApp({ service, source });
}

describe('API (provider simulated)', () => {
  let fetchFn: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchFn = vi.fn<typeof fetch>().mockImplementation(async () => providerOk());
  });

  describe('GET /countries/:code', () => {
    it('returns the flat, enriched country', async () => {
      const res = await request(buildApp(fetchFn)).get('/countries/GTM');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        code: 'GTM',
        name: 'Guatemala',
        region: 'Americas',
        neighbors: [
          { code: 'BLZ', name: 'Belize' },
          { code: 'SLV', name: 'El Salvador' },
          { code: 'HND', name: 'Honduras' },
          { code: 'MEX', name: 'Mexico' },
        ],
      });
      expect(res.body.densityPerKm2).toBe(10); // 100 / 10 from the fixture
    });

    it('accepts lowercase codes', async () => {
      const res = await request(buildApp(fetchFn)).get('/countries/gtm');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe('GTM');
    });

    it('does not call the provider on every request (cache)', async () => {
      const app = buildApp(fetchFn);

      await request(app).get('/countries/GTM');
      await request(app).get('/countries/MEX');
      await request(app).get('/routes?from=GTM&to=PAN');

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('404 COUNTRY_NOT_FOUND for an unknown code', async () => {
      const res = await request(buildApp(fetchFn)).get('/countries/XYZ');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: { code: 'COUNTRY_NOT_FOUND', message: 'No existe un país con el código XYZ.' },
      });
    });

    it('400 INVALID_PARAMETER for a malformed code', async () => {
      const res = await request(buildApp(fetchFn)).get('/countries/12');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('400 for a malformed URL instead of leaking a 500', async () => {
      const res = await request(buildApp(fetchFn)).get('/countries/%E0%A4%A');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });
  });

  describe('GET /routes', () => {
    it('returns the shortest land route', async () => {
      const res = await request(buildApp(fetchFn)).get('/routes?from=GTM&to=PAN');

      expect(res.status).toBe(200);
      expect(res.body.crossings).toBe(4);
      expect(res.body.path.map((p: { code: string }) => p.code)).toEqual([
        'GTM',
        'HND',
        'NIC',
        'CRI',
        'PAN',
      ]);
    });

    it('200 with crossings null when there is no land route', async () => {
      const res = await request(buildApp(fetchFn)).get('/routes?from=GTM&to=JPN');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ from: 'GTM', to: 'JPN', crossings: null, path: [] });
    });

    it('400 when a parameter is missing', async () => {
      const res = await request(buildApp(fetchFn)).get('/routes?from=GTM');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('404 when an endpoint country does not exist', async () => {
      const res = await request(buildApp(fetchFn)).get('/routes?from=GTM&to=XYZ');

      expect(res.status).toBe(404);
    });
  });

  describe('GET /regions/:region/ranking', () => {
    it('ranks the region, honoring limit', async () => {
      const res = await request(buildApp(fetchFn)).get(
        '/regions/americas/ranking?sortBy=population&limit=2',
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ region: 'Americas', sortBy: 'population', count: 2 });
    });

    it.each([
      ['missing sortBy', '/regions/Americas/ranking'],
      ['unknown sortBy', '/regions/Americas/ranking?sortBy=gdp'],
      ['limit above the max', '/regions/Americas/ranking?sortBy=area&limit=51'],
      ['limit not a number', '/regions/Americas/ranking?sortBy=area&limit=abc'],
      ['repeated parameter', '/regions/Americas/ranking?sortBy=area&sortBy=density'],
    ])('400 for %s', async (_label, url) => {
      const res = await request(buildApp(fetchFn)).get(url);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMETER');
    });

    it('404 REGION_NOT_FOUND for an unknown region', async () => {
      const res = await request(buildApp(fetchFn)).get('/regions/Atlantis/ranking?sortBy=area');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REGION_NOT_FOUND');
    });
  });

  describe('GET /health', () => {
    it('reports ok when the provider answers', async () => {
      const res = await request(buildApp(fetchFn)).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'ok', source: 'up' });
    });

    it('reports degraded when the provider is down', async () => {
      fetchFn.mockRejectedValue(new TypeError('fetch failed'));

      const res = await request(buildApp(fetchFn)).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ status: 'degraded', source: 'down' });
    });
  });

  describe('provider failures', () => {
    it('502 when the provider rejects our key, without leaking its message', async () => {
      fetchFn.mockResolvedValue(
        new Response(JSON.stringify({ errors: [{ message: 'No matching authorization key found.' }] }), {
          status: 401,
        }),
      );

      const res = await request(buildApp(fetchFn)).get('/countries/GTM');

      expect(res.status).toBe(502);
      expect(res.body.error.code).toBe('UPSTREAM_ERROR');
      expect(JSON.stringify(res.body)).not.toMatch(/authorization/i);
    });

    it('503 when the provider cannot be reached', async () => {
      fetchFn.mockRejectedValue(new TypeError('fetch failed'));

      const res = await request(buildApp(fetchFn)).get('/countries/GTM');

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('UPSTREAM_UNAVAILABLE');
    });
  });

  describe('unexpected situations', () => {
    it('404 with the standard format for unknown endpoints', async () => {
      const res = await request(buildApp(fetchFn)).get('/nope');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('500 INTERNAL_ERROR without exposing internal details', async () => {
      // Simulates a bug: the service throws something that is not an AppError
      const brokenService = {
        getCountry: () => Promise.reject(new Error('secret internal detail')),
      } as unknown as CountriesService;
      const app = createApp({
        service: brokenService,
        source: { fetchAllCountries: async () => [], ping: async () => undefined },
      });

      const res = await request(app).get('/countries/GTM');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado.' },
      });
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });
  });
});
