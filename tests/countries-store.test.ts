import { describe, expect, it, vi } from 'vitest';
import type { CountriesSource } from '../src/domain/countries-source.js';
import type { Country } from '../src/domain/country.js';
import { upstreamUnavailable } from '../src/domain/errors.js';
import { CountriesStore } from '../src/services/countries-store.js';

const country = (code: string): Country => ({
  code,
  name: code,
  region: 'Americas',
  capital: null,
  population: 1,
  areaKm2: 1,
  currencies: [],
  languages: [],
  borders: [],
});

const TTL = 1000;

function setup(fetchAllCountries: CountriesSource['fetchAllCountries']) {
  const fetchSpy = vi.fn(fetchAllCountries);
  const source: CountriesSource = { fetchAllCountries: fetchSpy, ping: async () => undefined };
  let time = 0;
  const store = new CountriesStore(source, TTL, () => time);
  return { store, fetchSpy, advance: (ms: number) => (time += ms) };
}

describe('CountriesStore', () => {
  it('calls the source once while the cache is fresh', async () => {
    const { store, fetchSpy, advance } = setup(async () => [country('GTM')]);

    await store.getAll();
    advance(TTL - 1);
    await store.getAll();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the TTL expires', async () => {
    const { store, fetchSpy, advance } = setup(async () => [country('GTM')]);

    await store.getAll();
    advance(TTL);
    await store.getAll();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('shares one in-flight load between concurrent requests', async () => {
    const { store, fetchSpy } = setup(async () => [country('GTM')]);

    await Promise.all([store.getAll(), store.getAll(), store.getIndex()]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('exposes an index to look countries up by code', async () => {
    const { store } = setup(async () => [country('GTM'), country('MEX')]);

    const index = await store.getIndex();

    expect(index.get('MEX')?.code).toBe('MEX');
    expect(index.has('XYZ')).toBe(false);
  });

  it('serves stale data when a refresh fails, and backs off before retrying', async () => {
    let fail = false;
    const { store, fetchSpy, advance } = setup(async () => {
      if (fail) throw upstreamUnavailable();
      return [country('GTM')];
    });

    await store.getAll();
    fail = true;
    advance(TTL);

    expect(await store.getAll()).toHaveLength(1); // stale, no error
    await store.getAll(); // within back-off: no new provider call
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('propagates the error when there is no data to fall back on', async () => {
    const { store } = setup(async () => {
      throw upstreamUnavailable();
    });

    await expect(store.getAll()).rejects.toMatchObject({ status: 503 });
  });

  it('retries on the next request after a failed first load', async () => {
    let fail = true;
    const { store, fetchSpy } = setup(async () => {
      if (fail) throw upstreamUnavailable();
      return [country('GTM')];
    });

    await expect(store.getAll()).rejects.toBeDefined();
    fail = false;

    expect(await store.getAll()).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
