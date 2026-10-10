import { describe, expect, it } from 'vitest';
import type { CountriesSource } from '../src/domain/countries-source.js';
import { CountriesService } from '../src/services/countries-service.js';
import { CountriesStore } from '../src/services/countries-store.js';
import { CENTRAL_AMERICA } from './fixtures.js';

const source: CountriesSource = {
  fetchAllCountries: async () => CENTRAL_AMERICA,
  ping: async () => undefined,
};
const service = new CountriesService(new CountriesStore(source, 60_000));

describe('CountriesService', () => {
  it('returns the country detail', async () => {
    expect(await service.getCountry('GTM')).toMatchObject({ code: 'GTM', name: 'Guatemala' });
  });

  it('throws COUNTRY_NOT_FOUND for an unknown code', async () => {
    await expect(service.getCountry('XYZ')).rejects.toMatchObject({
      code: 'COUNTRY_NOT_FOUND',
      status: 404,
    });
  });

  it('computes the route and its crossings', async () => {
    const route = await service.getRoute('GTM', 'PAN');

    expect(route.crossings).toBe(4);
    expect(route.path.map((p) => p.name)).toEqual([
      'Guatemala',
      'Honduras',
      'Nicaragua',
      'Costa Rica',
      'Panama',
    ]);
  });

  it('returns 0 crossings when origin equals destination', async () => {
    expect(await service.getRoute('GTM', 'GTM')).toMatchObject({ crossings: 0 });
  });

  it('reports "no land route" with crossings null and an empty path', async () => {
    expect(await service.getRoute('GTM', 'JPN')).toEqual({
      from: 'GTM',
      to: 'JPN',
      crossings: null,
      path: [],
    });
  });

  it('throws COUNTRY_NOT_FOUND when a route endpoint does not exist', async () => {
    await expect(service.getRoute('GTM', 'XYZ')).rejects.toMatchObject({ status: 404 });
  });

  it('throws REGION_NOT_FOUND for an unknown region', async () => {
    await expect(service.getRanking('Atlantis', 'area', 5)).rejects.toMatchObject({
      code: 'REGION_NOT_FOUND',
      status: 404,
    });
  });

  it('ranks a region regardless of the input casing', async () => {
    const ranking = await service.getRanking('americas', 'population', 2);

    expect(ranking.region).toBe('Americas');
    expect(ranking.count).toBe(2);
  });
});
