# rest-countries-middleware-api

Middleware API on top of [REST Countries v5](https://restcountries.com/docs/countries).
Clients call this API instead of the public one, and get a simpler, cleaner and
richer contract: flat objects, neighbors resolved by name, computed density,
land routes between countries and per-region rankings.

Stack: Node.js 20+, TypeScript (strict), Express 5, Vitest + Supertest.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure the API key

Create a free account at [restcountries.com](https://restcountries.com) to get a key, then:

```bash
cp .env.example .env
```

and set `RESTCOUNTRIES_API_KEY` in `.env`. The key is read from the environment
only; `.env` is git-ignored and `.env.example` contains no real values.

| Variable | Default | Description |
|---|---|---|
| `RESTCOUNTRIES_API_KEY` | – (required) | Sent as `Authorization: Bearer <key>` |
| `RESTCOUNTRIES_BASE_URL` | `https://api.restcountries.com/countries/v5` | Provider base URL |
| `PORT` | `3000` | Port this API listens on |
| `CACHE_TTL_SECONDS` | `21600` (6 h) | How long the dataset stays cached |
| `UPSTREAM_TIMEOUT_MS` | `8000` | Max wait per provider call |

The app fails fast at startup if the key is missing or a numeric variable is invalid.

### 3. Run

```bash
npm run dev          # watch mode (tsx)
npm run build && npm start   # compiled output
```

### 4. Test

```bash
npm test             # unit + integration, no network or API key needed
npm run typecheck    # strict TypeScript check
```

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /countries/{code}` | Country detail with neighbors and density |
| `GET /routes?from=GTM&to=PAN` | Land route with the fewest border crossings |
| `GET /regions/{region}/ranking?sortBy=density&limit=5` | Top countries of a region |
| `GET /health` | API and provider status |

### Examples

```bash
curl http://localhost:3000/countries/gtm
```

```json
{
  "code": "GTM",
  "name": "Guatemala",
  "region": "Americas",
  "capital": "Guatemala City",
  "population": 18406359,
  "areaKm2": 108889,
  "densityPerKm2": 169.04,
  "currencies": ["GTQ"],
  "languages": ["Spanish"],
  "neighbors": [
    { "code": "BLZ", "name": "Belize" },
    { "code": "SLV", "name": "El Salvador" },
    { "code": "HND", "name": "Honduras" },
    { "code": "MEX", "name": "Mexico" }
  ]
}
```

```bash
curl "http://localhost:3000/routes?from=GTM&to=PAN"
# {"from":"GTM","to":"PAN","crossings":4,"path":[{"code":"GTM",...},{"code":"HND",...},...,{"code":"PAN",...}]}

curl "http://localhost:3000/routes?from=GTM&to=JPN"
# {"from":"GTM","to":"JPN","crossings":null,"path":[]}   <- no land route

curl "http://localhost:3000/regions/Americas/ranking?sortBy=population&limit=3"
# {"region":"Americas","sortBy":"population","count":3,"items":[{"rank":1,"code":"USA",...,"value":...},...]}

curl http://localhost:3000/health
# {"status":"ok","source":"up"}
```

### Parameters

- `code`, `from`, `to`: 3-letter country code, any case.
- `region`: case-insensitive (`americas` → `Americas`). Valid regions come from the data
  (currently Africa, Americas, Antarctic, Asia, Europe, Oceania).
- `sortBy`: required, one of `density`, `population`, `area`.
- `limit`: optional integer, 1–50, default 5.

### Errors

Every error has the same shape and the right HTTP status. The `message` is written in Spanish (user-facing, as in the spec's example); the `code` is the stable, machine-readable part:

```json
{ "error": { "code": "COUNTRY_NOT_FOUND", "message": "No existe un país con el código XYZ." } }
```

| Situation | HTTP | `code` |
|---|---|---|
| Missing or invalid parameter | 400 | `INVALID_PARAMETER` |
| Unknown country | 404 | `COUNTRY_NOT_FOUND` |
| Unknown region | 404 | `REGION_NOT_FOUND` |
| Unknown URL | 404 | `ENDPOINT_NOT_FOUND` |
| Provider answered with an error | 502 | `UPSTREAM_ERROR` |
| Provider unreachable / timeout | 503 | `UPSTREAM_UNAVAILABLE` |
| Anything unexpected | 500 | `INTERNAL_ERROR` (no internal details exposed) |

## Architecture

```
src/
  server.ts            composition root: config -> real dependencies -> listen
  app.ts               createApp(deps): Express app factory, no side effects
  config.ts            env loading and validation (fails fast)
  routes/              HTTP layer: validate input, call the service, send JSON
  middleware/          input validation and the single error formatter
  services/            business logic (pure functions) + store (cache) + service
  clients/             REST Countries client + mapper + raw provider types
  domain/              internal Country model, errors, response contracts
tests/                 unit + integration tests
```

Dependencies point inward: routes → service → store → `CountriesSource` (interface)
← REST Countries client. The business logic (`country-detail`, `route-finder`,
`ranking`) are pure functions over `Country[]`, tested without network.

## Design decisions

**Provider isolation.** The client maps the provider's nested format to an internal
`Country` right at the boundary. Nothing else knows REST Countries' shape, so swapping
the provider means writing one new `CountriesSource` implementation.

**Whole-dataset cache, 6 h TTL.** All endpoints need cross-country data (neighbor names,
routes, rankings), and the provider is paginated (~3 calls for ~250 countries), so the
full dataset is cached as one unit in memory. Country data (population, borders) changes
rarely, so a short TTL would only burn quota. Configurable via `CACHE_TTL_SECONDS`.
- Concurrent requests with a cold/expired cache share a single in-flight refresh.
- If a refresh fails and old data exists, stale data is served (and the provider is not
  retried for 30 s) instead of failing; with no data at all, the error propagates.

**Provider calls.** 8 s timeout per call; one retry on 5xx or network errors, never on
4xx; all pages are walked via `offset` and `meta.more` (with a page cap as a safety net).
Provider errors (including a 401 for a bad key) are logged internally and translated to
502/503, never forwarded to the client.

**Findings from the real API** (the spec's field list differs from reality):
- `capital` does not exist in v5; capitals come as a `capitals` list. A country with
  several capitals uses the one flagged `primary`, otherwise the first one; none → `null`.
- `currencies`/`languages` are objects; we expose currency codes and language names.
- 4 disputed territories have an empty `alpha_3` code (Abkhazia, Northern Cyprus,
  Somaliland, South Ossetia) and are discarded, as they can't be identified by code.
- Missing numbers become `null` rather than invented values; the ranking skips them.

**Density.** `population / area`, rounded to 2 decimals; `null` if area is 0 or unknown.

**Land routes.** Breadth-first search, so the first path found has the fewest crossings.
Borders are treated as bidirectional even if the provider lists them on one side only,
and unknown border codes are ignored. Ties are resolved deterministically (sorted codes).
Origin = destination gives 0 crossings. "No land route" is a valid answer, not a client
error, so it returns **200** with `crossings: null` and an empty `path`.

**Ranking.** Descending by value; ties are broken by name so output is stable. Invalid
`limit` (0, > 50, non-numeric) is rejected with 400 instead of silently clamped.

**`/health`.** Always 200 while the API is alive; `status` is `ok` or `degraded` depending
on whether the provider answers, so a vendor outage doesn't make orchestrators restart a
healthy process. It probes the provider directly (1 record), bypassing the cache.

## Known limitations / next steps

- The cache is per process (in memory); multiple instances would each refresh on their own.
  A shared cache (e.g. Redis) would be the next step.
- No rate limiting or authentication on this API.
- Language/currency data for a few territories may be empty because the provider has none.
