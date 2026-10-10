import { describe, expect, it } from 'vitest';
import { findLandRoute } from '../src/services/route-finder.js';
import { CENTRAL_AMERICA, makeCountry } from './fixtures.js';

const codes = (path: readonly { code: string }[] | null) => path?.map((c) => c.code);

describe('findLandRoute', () => {
  it('finds the route with the fewest border crossings', () => {
    const path = findLandRoute(CENTRAL_AMERICA, 'GTM', 'PAN');

    expect(codes(path)).toEqual(['GTM', 'HND', 'NIC', 'CRI', 'PAN']);
    expect(path).toHaveLength(5); // 4 crossings
  });

  it('returns a single-country path when origin equals destination', () => {
    expect(codes(findLandRoute(CENTRAL_AMERICA, 'GTM', 'GTM'))).toEqual(['GTM']);
  });

  it('returns null when there is no land route', () => {
    expect(findLandRoute(CENTRAL_AMERICA, 'GTM', 'JPN')).toBeNull();
  });

  it('returns null when a country is unknown', () => {
    expect(findLandRoute(CENTRAL_AMERICA, 'GTM', 'XYZ')).toBeNull();
    expect(findLandRoute(CENTRAL_AMERICA, 'XYZ', 'GTM')).toBeNull();
  });

  it('treats borders as bidirectional even if the provider lists one side only', () => {
    // MEX only declares BLZ, yet GTM->MEX must still work through the GTM side
    expect(codes(findLandRoute(CENTRAL_AMERICA, 'MEX', 'SLV'))).toEqual(['MEX', 'GTM', 'SLV']);
  });

  it('ignores border codes missing from the dataset', () => {
    const countries = [makeCountry('AAA', { borders: ['ZZZ', 'BBB'] }), makeCountry('BBB')];

    expect(codes(findLandRoute(countries, 'AAA', 'BBB'))).toEqual(['AAA', 'BBB']);
  });
});
