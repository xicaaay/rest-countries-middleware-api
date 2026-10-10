import { describe, expect, it } from 'vitest';
import { findRegion, rankRegion } from '../src/services/ranking.js';
import { makeCountry } from './fixtures.js';

const countries = [
  makeCountry('SLV', { name: 'El Salvador', population: 6_300_000, areaKm2: 21_041 }), // 299.42
  makeCountry('GTM', { name: 'Guatemala', population: 17_000_000, areaKm2: 108_889 }), // 156.12
  makeCountry('CAN', { name: 'Canada', population: 40_000_000, areaKm2: 9_984_670 }), // 4.01
  makeCountry('ATA', { name: 'No area', population: 5, areaKm2: null }),
  makeCountry('ZZZ', { name: 'No population', population: null, areaKm2: 10 }),
  makeCountry('JPN', { name: 'Japan', region: 'Asia', population: 1, areaKm2: 1 }),
];

describe('rankRegion', () => {
  it('orders by density, highest first, with 1-based ranks', () => {
    const result = rankRegion(countries, 'Americas', 'density', 5);

    expect(result.items.map((i) => [i.rank, i.code, i.value])).toEqual([
      [1, 'SLV', 299.42],
      [2, 'GTM', 156.12],
      [3, 'CAN', 4.01],
    ]);
    expect(result.count).toBe(3);
  });

  it('ignores countries without the data needed to sort', () => {
    const byArea = rankRegion(countries, 'Americas', 'area', 10);
    const byPopulation = rankRegion(countries, 'Americas', 'population', 10);

    expect(byArea.items.map((i) => i.code)).not.toContain('ATA');
    expect(byPopulation.items.map((i) => i.code)).not.toContain('ZZZ');
  });

  it('only includes the requested region and respects the limit', () => {
    const result = rankRegion(countries, 'Americas', 'population', 1);

    expect(result.items).toEqual([{ rank: 1, code: 'CAN', name: 'Canada', value: 40_000_000 }]);
    expect(result).toMatchObject({ region: 'Americas', sortBy: 'population', count: 1 });
  });

  it('breaks ties by name so the output is stable', () => {
    const tied = [
      makeCountry('BBB', { name: 'Beta', population: 10 }),
      makeCountry('AAA', { name: 'Alpha', population: 10 }),
    ];

    expect(rankRegion(tied, 'Americas', 'population', 5).items.map((i) => i.code)).toEqual([
      'AAA',
      'BBB',
    ]);
  });
});

describe('findRegion', () => {
  it('matches case-insensitively and returns the canonical name', () => {
    expect(findRegion(countries, 'americas')).toBe('Americas');
    expect(findRegion(countries, ' ASIA ')).toBe('Asia');
  });

  it('returns undefined for unknown regions', () => {
    expect(findRegion(countries, 'Atlantis')).toBeUndefined();
  });
});
