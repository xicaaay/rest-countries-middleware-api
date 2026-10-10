// Internal, provider-independent country model.
// Everything outside the client layer works with this type only, so swapping
// the data provider never leaks into services, routes or API responses.
export interface Country {
  readonly code: string; // ISO 3166-1 alpha-3, uppercase (e.g. "GTM")
  readonly name: string;
  readonly region: string;
  readonly capital: string | null;
  readonly population: number;
  readonly areaKm2: number | null; // null when the provider has no usable area
  readonly currencies: readonly string[]; // currency codes, e.g. ["GTQ"]
  readonly languages: readonly string[]; // language names, e.g. ["Spanish"]
  readonly borders: readonly string[]; // alpha-3 codes of land neighbors
}
