import { describe, expect, it } from 'vitest';
import { mapCountries, mapCountry } from '../src/clients/restcountries.mapper.js';

describe('mapCountry', () => {
  it('flattens the provider shape into the internal model', () => {
    const country = mapCountry({
      codes: { alpha_3: 'gtm' },
      names: { common: 'Guatemala' },
      region: 'Americas',
      capitals: [{ name: 'Guatemala City', attributes: { primary: true } }],
      currencies: [{ code: 'GTQ' }],
      languages: [{ name: 'Spanish' }],
      borders: ['blz', 'SLV'],
      population: 18406359,
      area: { kilometers: 108889 },
    });

    expect(country).toEqual({
      code: 'GTM',
      name: 'Guatemala',
      region: 'Americas',
      capital: 'Guatemala City',
      population: 18406359,
      areaKm2: 108889,
      currencies: ['GTQ'],
      languages: ['Spanish'],
      borders: ['BLZ', 'SLV'],
    });
  });

  it('prefers the primary capital, then falls back to the first one', () => {
    const base = { codes: { alpha_3: 'XXX' }, names: { common: 'X' }, region: 'Africa' };

    const withPrimary = mapCountry({
      ...base,
      capitals: [{ name: 'A' }, { name: 'B', attributes: { primary: true } }],
    });
    const withoutPrimary = mapCountry({
      ...base,
      capitals: [{ name: 'Pretoria' }, { name: 'Cape Town' }],
    });
    const withNone = mapCountry({ ...base, capitals: [] });

    expect(withPrimary?.capital).toBe('B');
    expect(withoutPrimary?.capital).toBe('Pretoria');
    expect(withNone?.capital).toBeNull();
  });

  it('uses null / empty lists for missing data instead of inventing values', () => {
    const country = mapCountry({
      codes: { alpha_3: 'BVT' },
      names: { common: 'Bouvet Island' },
      region: 'Antarctic',
    });

    expect(country).toMatchObject({
      capital: null,
      population: null,
      areaKm2: null,
      currencies: [],
      languages: [],
      borders: [],
    });
  });

  it('discards entries that cannot be identified (empty alpha-3 code)', () => {
    const raw = { codes: { alpha_3: '' }, names: { common: 'Abkhazia' }, region: 'Asia' };

    expect(mapCountry(raw)).toBeNull();
    expect(mapCountries([raw])).toEqual([]);
  });
});
