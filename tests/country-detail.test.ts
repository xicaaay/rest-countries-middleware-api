import { describe, expect, it } from 'vitest';
import { calculateDensity } from '../src/domain/metrics.js';
import { toCountryDetail } from '../src/services/country-detail.js';
import { CENTRAL_AMERICA, makeCountry } from './fixtures.js';

const byCode = new Map(CENTRAL_AMERICA.map((c) => [c.code, c]));

describe('calculateDensity', () => {
  it('rounds population / area to 2 decimals', () => {
    expect(calculateDensity({ population: 17_000_000, areaKm2: 108_889 })).toBe(156.12);
  });

  it('returns null when the area is 0 or unknown, or the population is unknown', () => {
    expect(calculateDensity({ population: 10, areaKm2: 0 })).toBeNull();
    expect(calculateDensity({ population: 10, areaKm2: null })).toBeNull();
    expect(calculateDensity({ population: null, areaKm2: 10 })).toBeNull();
  });

  it('returns 0 for an uninhabited country with a valid area', () => {
    expect(calculateDensity({ population: 0, areaKm2: 49 })).toBe(0);
  });
});

describe('toCountryDetail', () => {
  it('resolves neighbors by name, sorted by name', () => {
    const gtm = byCode.get('GTM');
    if (!gtm) throw new Error('fixture missing');

    const detail = toCountryDetail(gtm, byCode);

    expect(detail.neighbors).toEqual([
      { code: 'BLZ', name: 'Belize' },
      { code: 'SLV', name: 'El Salvador' },
      { code: 'HND', name: 'Honduras' },
      { code: 'MEX', name: 'Mexico' },
    ]);
  });

  it('adds the computed density and keeps the flat contract', () => {
    const detail = toCountryDetail(
      makeCountry('GTM', { name: 'Guatemala', population: 17_000_000, areaKm2: 108_889 }),
      byCode,
    );

    expect(detail).toMatchObject({
      code: 'GTM',
      name: 'Guatemala',
      areaKm2: 108_889,
      densityPerKm2: 156.12,
    });
  });

  it('skips border codes that are not in the dataset', () => {
    const detail = toCountryDetail(makeCountry('AAA', { borders: ['ZZZ', 'BLZ'] }), byCode);

    expect(detail.neighbors).toEqual([{ code: 'BLZ', name: 'Belize' }]);
  });
});
