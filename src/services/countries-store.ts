import type { CountriesSource } from '../domain/countries-source.js';
import type { Country } from '../domain/country.js';

// After a failed refresh we keep serving stale data, but wait this long before
// hitting the provider again so an outage doesn't slow down every request.
const STALE_RETRY_MS = 30_000;

interface Snapshot {
  readonly countries: readonly Country[];
  readonly byCode: ReadonlyMap<string, Country>;
  readonly expiresAt: number;
}

// In-memory cache of the full countries dataset (~250 records).
// The whole dataset is cached as one unit because every endpoint needs
// cross-country data (neighbor names, routes, rankings), and the provider
// has to be paginated anyway: one refresh costs 3 calls per TTL window.
export class CountriesStore {
  private snapshot: Snapshot | null = null;
  private inFlight: Promise<Snapshot> | null = null;

  constructor(
    private readonly source: CountriesSource,
    private readonly ttlMs: number,
    // Injectable clock so tests can expire the cache without waiting
    private readonly now: () => number = Date.now,
  ) {}

  async getAll(): Promise<readonly Country[]> {
    return (await this.load()).countries;
  }

  // Country lookup by alpha-3 code, built once per refresh (not per request)
  async getIndex(): Promise<ReadonlyMap<string, Country>> {
    return (await this.load()).byCode;
  }

  private async load(): Promise<Snapshot> {
    const current = this.snapshot;
    if (current && this.now() < current.expiresAt) return current;

    // Concurrent requests share one refresh instead of each hitting the provider
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<Snapshot> {
    try {
      const countries = await this.source.fetchAllCountries();
      this.snapshot = {
        countries,
        byCode: new Map(countries.map((c) => [c.code, c])),
        expiresAt: this.now() + this.ttlMs,
      };
    } catch (error) {
      // Provider down but we still have old data: prefer stale over failing
      if (!this.snapshot) throw error;

      console.warn('[countries-store] refresh failed, serving stale data');
      this.snapshot = { ...this.snapshot, expiresAt: this.now() + STALE_RETRY_MS };
    }
    return this.snapshot;
  }
}
