// Raw shapes returned by REST Countries v5.
// Confirmed against the live API. Only the fields we request via
// `response_fields` are modeled; every one is optional because the provider
// may omit any of them, so the mapper must never trust them blindly.

export interface RawCapital {
  readonly name?: string;
  readonly attributes?: { readonly primary?: boolean };
}

export interface RawCurrency {
  readonly code?: string;
}

export interface RawLanguage {
  readonly name?: string;
}

export interface RawCountry {
  readonly codes?: { readonly alpha_3?: string }; // can be "" for disputed territories
  readonly names?: { readonly common?: string };
  readonly region?: string;
  readonly capitals?: readonly RawCapital[];
  readonly currencies?: readonly RawCurrency[];
  readonly languages?: readonly RawLanguage[];
  readonly borders?: readonly string[];
  readonly population?: number;
  readonly area?: { readonly kilometers?: number };
}

export interface RawPageMeta {
  readonly total: number;
  readonly count: number;
  readonly limit: number;
  readonly offset: number;
  readonly more: boolean; // true while there are more pages to fetch
}

// Successful response: { data: { objects, meta } }
export interface RawCountriesPage {
  readonly data: {
    readonly objects: readonly RawCountry[];
    readonly meta: RawPageMeta;
  };
}

// Error response: { errors: [{ message, code }] }
export interface RawErrorResponse {
  readonly errors: readonly { readonly message?: string; readonly code?: string }[];
}
