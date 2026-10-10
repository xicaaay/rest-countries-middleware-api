import 'dotenv/config';

export interface Config {
  readonly port: number;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly cacheTtlMs: number;
  readonly upstreamTimeoutMs: number;
}

// Reads a positive integer from the environment, falling back to a default
function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }
  return value;
}

// Fails fast at startup instead of failing on the first upstream call
export function loadConfig(): Config {
  const apiKey = process.env['RESTCOUNTRIES_API_KEY'];
  if (!apiKey) {
    throw new Error('Missing RESTCOUNTRIES_API_KEY. Copy .env.example to .env and set it.');
  }

  return {
    port: readPositiveInt('PORT', 3000),
    apiKey,
    baseUrl: process.env['RESTCOUNTRIES_BASE_URL'] ?? 'https://api.restcountries.com/countries/v5',
    cacheTtlMs: readPositiveInt('CACHE_TTL_SECONDS', 21600) * 1000,
    upstreamTimeoutMs: readPositiveInt('UPSTREAM_TIMEOUT_MS', 8000),
  };
}
