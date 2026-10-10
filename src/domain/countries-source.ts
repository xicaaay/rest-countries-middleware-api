import type { Country } from './country.js';

// Port that the business layer depends on. The REST Countries client is one
// implementation; tests plug in an in-memory fake, and a different provider
// could be swapped in without touching services or routes.
export interface CountriesSource {
  // Returns every country, already normalized to the internal model
  fetchAllCountries(): Promise<Country[]>;

  // Cheap reachability check; rejects with an AppError when the source is down
  ping(): Promise<void>;
}
