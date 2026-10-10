import { createApp } from './app.js';
import { RestCountriesClient } from './clients/restcountries.client.js';
import { loadConfig } from './config.js';
import { CountriesService } from './services/countries-service.js';
import { CountriesStore } from './services/countries-store.js';

// Entry point and composition root: the only place that reads config,
// wires the real dependencies together and opens a port.
const config = loadConfig();

const source = new RestCountriesClient({
  baseUrl: config.baseUrl,
  apiKey: config.apiKey,
  timeoutMs: config.upstreamTimeoutMs,
});
const service = new CountriesService(new CountriesStore(source, config.cacheTtlMs));
const app = createApp({ service, source });

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
