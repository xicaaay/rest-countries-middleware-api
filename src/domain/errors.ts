// Stable machine-readable codes returned to API clients
export type ErrorCode =
  | 'INVALID_PARAMETER'
  | 'COUNTRY_NOT_FOUND'
  | 'REGION_NOT_FOUND'
  | 'UPSTREAM_ERROR'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL_ERROR';

// Base class for every error we intentionally expose to clients.
// Anything that is NOT an AppError is treated as unexpected (HTTP 500).
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 400: missing or malformed input
export const invalidParameter = (message: string): AppError =>
  new AppError('INVALID_PARAMETER', 400, message);

// 404: unknown country code
export const countryNotFound = (code: string): AppError =>
  new AppError('COUNTRY_NOT_FOUND', 404, `No country exists with code ${code}.`);

// 404: unknown region
export const regionNotFound = (region: string): AppError =>
  new AppError('REGION_NOT_FOUND', 404, `No region exists with name ${region}.`);

// 502: the provider answered, but with an error or an unusable payload
export const upstreamError = (): AppError =>
  new AppError('UPSTREAM_ERROR', 502, 'The countries data source returned an error.');

// 503: the provider could not be reached (network failure or timeout)
export const upstreamUnavailable = (): AppError =>
  new AppError('UPSTREAM_UNAVAILABLE', 503, 'The countries data source is unavailable.');
