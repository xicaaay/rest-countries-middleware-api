import type { Country } from '../domain/country.js';
import { calculateDensity } from '../domain/metrics.js';
import type { RankingItem, RankingResult, SortKey } from '../domain/views.js';

// Numeric value used to rank a country; null means "no data for this metric"
function metricOf(country: Country, sortBy: SortKey): number | null {
  switch (sortBy) {
    case 'density':
      return calculateDensity(country);
    case 'population':
      return country.population;
    case 'area':
      return country.areaKm2;
  }
}

// Case-insensitive lookup of a region name present in the data.
// Returns the canonical spelling (e.g. "americas" -> "Americas") or undefined.
export function findRegion(countries: readonly Country[], input: string): string | undefined {
  const wanted = input.trim().toLowerCase();
  return countries.find((c) => c.region.toLowerCase() === wanted)?.region;
}

// Top `limit` countries of a region, highest value first.
// Countries without the metric are ignored; ties break by name for stable output.
export function rankRegion(
  countries: readonly Country[],
  region: string,
  sortBy: SortKey,
  limit: number,
): RankingResult {
  const candidates: { country: Country; value: number }[] = [];
  for (const country of countries) {
    if (country.region !== region) continue;

    const value = metricOf(country, sortBy);
    if (value !== null) candidates.push({ country, value });
  }

  candidates.sort(
    (a, b) => b.value - a.value || a.country.name.localeCompare(b.country.name),
  );

  const items: RankingItem[] = candidates.slice(0, limit).map(({ country, value }, index) => ({
    rank: index + 1,
    code: country.code,
    name: country.name,
    value,
  }));

  return { region, sortBy, count: items.length, items };
}
