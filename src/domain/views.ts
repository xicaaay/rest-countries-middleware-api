// Public response contracts of this API (independent from the provider's format)

export interface CountryRef {
  readonly code: string;
  readonly name: string;
}

// GET /countries/{code}
export interface CountryDetail extends CountryRef {
  readonly region: string;
  readonly capital: string | null;
  readonly population: number | null;
  readonly areaKm2: number | null;
  readonly densityPerKm2: number | null;
  readonly currencies: readonly string[];
  readonly languages: readonly string[];
  readonly neighbors: readonly CountryRef[];
}

// GET /routes?from=&to=
// `crossings` is null and `path` empty when no land route exists
export interface RouteResult {
  readonly from: string;
  readonly to: string;
  readonly crossings: number | null;
  readonly path: readonly CountryRef[];
}

export const SORT_KEYS = ['density', 'population', 'area'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface RankingItem extends CountryRef {
  readonly rank: number;
  readonly value: number;
}

// GET /regions/{region}/ranking
export interface RankingResult {
  readonly region: string;
  readonly sortBy: SortKey;
  readonly count: number;
  readonly items: readonly RankingItem[];
}
