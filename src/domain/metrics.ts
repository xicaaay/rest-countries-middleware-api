import type { Country } from './country.js';

// Population / area, rounded to 2 decimals.
// Returns null when either value is unknown or the area is 0 (no division by zero).
export function calculateDensity(country: Pick<Country, 'population' | 'areaKm2'>): number | null {
  const { population, areaKm2 } = country;
  if (population === null || areaKm2 === null || areaKm2 === 0) return null;

  return Math.round((population / areaKm2) * 100) / 100;
}
