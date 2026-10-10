import { invalidParameter } from '../domain/errors.js';
import { SORT_KEYS, type SortKey } from '../domain/views.js';

export const DEFAULT_LIMIT = 5;
export const MAX_LIMIT = 50;

// Express query values can be string | string[] | object; we only accept a
// single string (?a=1&a=2 or ?a[x]=1 are rejected as invalid input).
function requireString(value: unknown, name: string): string {
  if (value === undefined || value === '') {
    throw invalidParameter(`Missing required parameter "${name}".`);
  }
  if (typeof value !== 'string') {
    throw invalidParameter(`Parameter "${name}" must be a single value.`);
  }
  return value.trim();
}

// ISO alpha-3 codes: exactly 3 letters, accepted in any case, normalized to uppercase
export function parseCountryCode(value: unknown, name: string): string {
  const code = requireString(value, name);
  if (!/^[A-Za-z]{3}$/.test(code)) {
    throw invalidParameter(`Parameter "${name}" must be a 3-letter country code (e.g. GTM).`);
  }
  return code.toUpperCase();
}

// Region names are free text (e.g. "Americas"); only reject clearly bogus input
export function parseRegion(value: unknown): string {
  const region = requireString(value, 'region');
  if (region.length > 50 || !/^[\p{L} .'-]+$/u.test(region)) {
    throw invalidParameter('Parameter "region" must be a valid region name (e.g. Americas).');
  }
  return region;
}

export function parseSortBy(value: unknown): SortKey {
  const sortBy = requireString(value, 'sortBy');
  const match = SORT_KEYS.find((key) => key === sortBy);
  if (!match) {
    throw invalidParameter(`Parameter "sortBy" must be one of: ${SORT_KEYS.join(', ')}.`);
  }
  return match;
}

// Optional; defaults to 5 and must be an integer between 1 and 50
export function parseLimit(value: unknown): number {
  if (value === undefined || value === '') return DEFAULT_LIMIT;

  const raw = requireString(value, 'limit');
  const limit = Number(raw);
  if (!/^\d+$/.test(raw) || limit < 1 || limit > MAX_LIMIT) {
    throw invalidParameter(`Parameter "limit" must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  return limit;
}
