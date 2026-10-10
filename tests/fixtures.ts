import type { Country } from '../src/domain/country.js';

// Compact builder so each test only states what it cares about
export function makeCountry(code: string, overrides: Partial<Country> = {}): Country {
  return {
    code,
    name: code,
    region: 'Americas',
    capital: null,
    population: 100,
    areaKm2: 10,
    currencies: [],
    languages: [],
    borders: [],
    ...overrides,
  };
}

// Small land-border graph. JPN is an island (no borders).
// Note: MEX->GTM is declared on one side only (asymmetric on purpose).
export const CENTRAL_AMERICA: Country[] = [
  makeCountry('GTM', { name: 'Guatemala', borders: ['BLZ', 'SLV', 'HND', 'MEX'] }),
  makeCountry('BLZ', { name: 'Belize', borders: ['GTM', 'MEX'] }),
  makeCountry('SLV', { name: 'El Salvador', borders: ['GTM', 'HND'] }),
  makeCountry('HND', { name: 'Honduras', borders: ['GTM', 'SLV', 'NIC'] }),
  makeCountry('NIC', { name: 'Nicaragua', borders: ['HND', 'CRI'] }),
  makeCountry('CRI', { name: 'Costa Rica', borders: ['NIC', 'PAN'] }),
  makeCountry('PAN', { name: 'Panama', borders: ['CRI', 'COL'] }),
  makeCountry('COL', { name: 'Colombia', borders: ['PAN'] }),
  makeCountry('MEX', { name: 'Mexico', borders: ['BLZ'] }),
  makeCountry('JPN', { name: 'Japan', region: 'Asia' }),
];
