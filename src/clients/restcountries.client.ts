import type { Country } from '../domain/country.js';
import type { CountriesSource } from '../domain/countries-source.js';
import { AppError, upstreamError, upstreamUnavailable } from '../domain/errors.js';
import { mapCountries } from './restcountries.mapper.js';
import type { RawCountriesPage } from './restcountries.types.js';

const PAGE_SIZE = 100; // max allowed by the free plan
const MAX_RETRIES = 1; // one extra attempt on 5xx / network errors, never on 4xx
const MAX_PAGES = 20; // safety net against a provider that never stops saying "more"

// `capital` is NOT a valid field in v5: capitals come as a list under `capitals`
const RESPONSE_FIELDS = [
  'codes.alpha_3',
  'names.common',
  'region',
  'capitals.name',
  'capitals.attributes.primary',
  'currencies.code',
  'languages.name',
  'borders',
  'population',
  'area.kilometers',
].join(',');

export interface RestCountriesClientOptions {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly timeoutMs: number;
  // Injectable so tests can simulate the provider without network access
  readonly fetchFn?: typeof fetch;
}

// Internal marker: a failure worth retrying (5xx or network/timeout error).
// Carries the AppError to throw if the retry budget is exhausted.
class RetryableFailure extends Error {
  constructor(readonly appError: AppError) {
    super(appError.message);
  }
}

export class RestCountriesClient implements CountriesSource {
  private readonly fetchFn: typeof fetch;

  constructor(private readonly options: RestCountriesClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch;
  }

  // Walks every page using offset until the provider reports meta.more = false
  async fetchAllCountries(): Promise<Country[]> {
    const countries: Country[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await this.getPage(page * PAGE_SIZE, PAGE_SIZE);
      countries.push(...mapCountries(data.objects));

      if (!data.meta.more || data.objects.length === 0) return countries;
    }

    // Never reached the last page: the data would be incomplete, so fail loudly
    console.error('[restcountries] pagination exceeded MAX_PAGES');
    throw upstreamError();
  }

  // Requests a single minimal record just to prove the provider answers
  async ping(): Promise<void> {
    await this.getPage(0, 1);
  }

  // Single page with retry policy applied
  private async getPage(offset: number, limit: number): Promise<RawCountriesPage> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.requestPage(offset, limit);
      } catch (error) {
        if (!(error instanceof RetryableFailure)) throw error;
        if (attempt >= MAX_RETRIES) throw error.appError;
      }
    }
  }

  private async requestPage(offset: number, limit: number): Promise<RawCountriesPage> {
    const url = new URL(this.options.baseUrl);
    url.searchParams.set('response_fields', RESPONSE_FIELDS);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));

    let response: Response;
    try {
      response = await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${this.options.apiKey}` },
        // Aborts the call (and rejects) if the provider takes too long
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (cause) {
      console.error('[restcountries] network error or timeout:', describe(cause));
      throw new RetryableFailure(upstreamUnavailable());
    }

    if (response.status >= 500) {
      console.error(`[restcountries] provider responded ${response.status}`);
      throw new RetryableFailure(upstreamError());
    }

    // 4xx (e.g. invalid API key) is our problem, not the client's: log it
    // internally and never forward the provider's message to API consumers.
    if (!response.ok) {
      console.error(`[restcountries] provider rejected the request: ${response.status}`);
      throw upstreamError();
    }

    return parsePage(response);
  }
}

// Validates the parts of the payload we rely on before trusting it
async function parsePage(response: Response): Promise<RawCountriesPage> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    console.error('[restcountries] response body is not valid JSON');
    throw upstreamError();
  }

  if (!isCountriesPage(body)) {
    console.error('[restcountries] unexpected response shape');
    throw upstreamError();
  }
  return body;
}

function isCountriesPage(body: unknown): body is RawCountriesPage {
  if (typeof body !== 'object' || body === null || !('data' in body)) return false;
  const data = body.data;
  if (typeof data !== 'object' || data === null) return false;
  if (!('objects' in data) || !Array.isArray(data.objects)) return false;
  if (!('meta' in data) || typeof data.meta !== 'object' || data.meta === null) return false;
  return 'more' in data.meta && typeof data.meta.more === 'boolean';
}

function describe(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
