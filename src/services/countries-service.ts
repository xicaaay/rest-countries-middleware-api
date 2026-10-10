import { countryNotFound, regionNotFound } from '../domain/errors.js';
import type { CountryDetail, RankingResult, RouteResult, SortKey } from '../domain/views.js';
import { toCountryDetail } from './country-detail.js';
import type { CountriesStore } from './countries-store.js';
import { findRegion, rankRegion } from './ranking.js';
import { findLandRoute } from './route-finder.js';

// Orchestrates store + pure logic and raises domain errors (404s).
// Input is expected to be validated and normalized (uppercase codes, etc.)
// by the HTTP layer before reaching this class.
export class CountriesService {
  constructor(private readonly store: CountriesStore) {}

  async getCountry(code: string): Promise<CountryDetail> {
    const countries = await this.store.getAll();
    const country = countries.find((c) => c.code === code);
    if (!country) throw countryNotFound(code);

    return toCountryDetail(country, new Map(countries.map((c) => [c.code, c])));
  }

  async getRoute(from: string, to: string): Promise<RouteResult> {
    const countries = await this.store.getAll();
    for (const code of [from, to]) {
      if (!countries.some((c) => c.code === code)) throw countryNotFound(code);
    }

    const path = findLandRoute(countries, from, to);
    return {
      from,
      to,
      crossings: path ? path.length - 1 : null,
      path: (path ?? []).map((c) => ({ code: c.code, name: c.name })),
    };
  }

  async getRanking(regionInput: string, sortBy: SortKey, limit: number): Promise<RankingResult> {
    const countries = await this.store.getAll();
    const region = findRegion(countries, regionInput);
    if (!region) throw regionNotFound(regionInput);

    return rankRegion(countries, region, sortBy, limit);
  }
}
