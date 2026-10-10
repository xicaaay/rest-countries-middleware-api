import type { Country } from '../domain/country.js';
import { calculateDensity } from '../domain/metrics.js';
import type { CountryDetail, CountryRef } from '../domain/views.js';

// Builds the flat, enriched detail of a country: neighbors resolved by name
// (sorted by name) plus the computed density. Pure: no network, no cache.
export function toCountryDetail(
  country: Country,
  byCode: ReadonlyMap<string, Country>,
): CountryDetail {
  const neighbors: CountryRef[] = [];
  for (const code of country.borders) {
    const neighbor = byCode.get(code);
    // Skip border codes the dataset doesn't know instead of failing the request
    if (neighbor) neighbors.push({ code: neighbor.code, name: neighbor.name });
  }
  neighbors.sort((a, b) => a.name.localeCompare(b.name));

  return {
    code: country.code,
    name: country.name,
    region: country.region,
    capital: country.capital,
    population: country.population,
    areaKm2: country.areaKm2,
    densityPerKm2: calculateDensity(country),
    currencies: country.currencies,
    languages: country.languages,
    neighbors,
  };
}
