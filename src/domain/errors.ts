// Stable machine-readable codes returned to API clients.
// The `message` of each error is user-facing and written in Spanish (as the
// spec's examples); internal logs (console.*) stay in English.
export type ErrorCode =
  | 'INVALID_PARAMETER'
  | 'COUNTRY_NOT_FOUND'
  | 'REGION_NOT_FOUND'
  | 'ENDPOINT_NOT_FOUND'
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
  new AppError('COUNTRY_NOT_FOUND', 404, `No existe un país con el código ${code}.`);

// 404: unknown region
export const regionNotFound = (region: string): AppError =>
  new AppError('REGION_NOT_FOUND', 404, `No existe una región con el nombre ${region}.`);

// 404: the URL itself doesn't match any endpoint of this API
export const endpointNotFound = (method: string, path: string): AppError =>
  new AppError('ENDPOINT_NOT_FOUND', 404, `No existe un endpoint para ${method} ${path}.`);

// 502: the provider answered, but with an error or an unusable payload
export const upstreamError = (): AppError =>
  new AppError('UPSTREAM_ERROR', 502, 'La fuente de datos de países devolvió un error.');

// 503: the provider could not be reached (network failure or timeout)
export const upstreamUnavailable = (): AppError =>
  new AppError('UPSTREAM_UNAVAILABLE', 503, 'La fuente de datos de países no está disponible.');