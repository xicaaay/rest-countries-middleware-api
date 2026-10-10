import { describe, expect, it, vi } from 'vitest';
import { RestCountriesClient } from '../src/clients/restcountries.client.js';

const country = (code: string) => ({
  codes: { alpha_3: code },
  names: { common: code },
  region: 'Americas',
});

const page = (codes: string[], more: boolean) =>
  new Response(JSON.stringify({ data: { objects: codes.map(country), meta: { more } } }), {
    status: 200,
  });

const makeClient = (fetchFn: typeof fetch) =>
  new RestCountriesClient({
    baseUrl: 'https://provider.test/countries/v5',
    apiKey: 'test-key',
    timeoutMs: 1000,
    fetchFn,
  });

describe('RestCountriesClient', () => {
  // Keep test output clean: the client logs provider failures on purpose
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  it('walks every page using offset and sends the Bearer key', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page(['AAA', 'BBB'], true))
      .mockResolvedValueOnce(page(['CCC'], false));

    const countries = await makeClient(fetchFn).fetchAllCountries();

    expect(countries.map((c) => c.code)).toEqual(['AAA', 'BBB', 'CCC']);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = fetchFn.mock.calls[0] ?? [];
    const [secondUrl] = fetchFn.mock.calls[1] ?? [];
    expect(String(secondUrl)).toContain('offset=100');
    expect(String(firstUrl)).toContain('offset=0');
    expect(new Headers(firstInit?.headers).get('Authorization')).toBe('Bearer test-key');
  });

  it('retries once on a 5xx and succeeds', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('boom', { status: 500 }))
      .mockResolvedValueOnce(page(['AAA'], false));

    const countries = await makeClient(fetchFn).fetchAllCountries();

    expect(countries).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('gives up with a 502 after the retry also returns 5xx', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('x', { status: 503 }));

    await expect(makeClient(fetchFn).fetchAllCountries()).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      status: 502,
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx and hides the provider message', async () => {
    const body = JSON.stringify({ errors: [{ message: 'No matching authorization key found.' }] });
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status: 401 }));

    const error = await makeClient(fetchFn)
      .fetchAllCountries()
      .catch((e: unknown) => e);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({ code: 'UPSTREAM_ERROR', status: 502 });
    expect(String((error as Error).message)).not.toContain('authorization');
  });

  it('retries once on a network error, then reports 503', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));

    await expect(makeClient(fetchFn).fetchAllCountries()).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      status: 503,
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects payloads that do not have the expected shape', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ hello: 'world' }), { status: 200 }));

    await expect(makeClient(fetchFn).fetchAllCountries()).rejects.toMatchObject({ status: 502 });
  });
});
