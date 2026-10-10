import type { Country } from '../domain/country.js';
import type { RawCapital, RawCountry } from './restcountries.types.js';

// Prefer the capital flagged as primary; otherwise fall back to the first one
// (e.g. South Africa has three capitals and none is flagged).
function pickCapital(capitals: readonly RawCapital[] | undefined): string | null {
  const named = (capitals ?? []).filter((c) => typeof c.name === 'string' && c.name !== '');
  const chosen = named.find((c) => c.attributes?.primary === true) ?? named[0];
  return chosen?.name ?? null;
}

// Keeps only finite, non-negative numbers; anything else means "no data"
function toNumberOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

// Removes empty values and duplicates while keeping the original order
function uniqueNonEmpty(values: readonly (string | undefined)[]): string[] {
  const result: string[] = [];
  for (const value of values) {
    if (typeof value === 'string' && value !== '' && !result.includes(value)) {
      result.push(value);
    }
  }
  return result;
}

// Converts the provider's shape into our internal Country.
// Returns null when the entry can't be identified (no alpha-3 code, name or
// region), as happens with a few disputed territories.
export function mapCountry(raw: RawCountry): Country | null {
  const code = raw.codes?.alpha_3?.trim().toUpperCase();
  const name = raw.names?.common;
  const region = raw.region;

  if (!code || !name || !region) return null;

  return {
    code,
    name,
    region,
    capital: pickCapital(raw.capitals),
    population: toNumberOrNull(raw.population),
    areaKm2: toNumberOrNull(raw.area?.kilometers),
    currencies: uniqueNonEmpty((raw.currencies ?? []).map((c) => c.code)),
    languages: uniqueNonEmpty((raw.languages ?? []).map((l) => l.name)),
    borders: uniqueNonEmpty((raw.borders ?? []).map((b) => b.trim().toUpperCase())),
  };
}

export function mapCountries(rawCountries: readonly RawCountry[]): Country[] {
  const countries: Country[] = [];
  for (const raw of rawCountries) {
    const country = mapCountry(raw);
    if (country) countries.push(country);
  }
  return countries;
}
