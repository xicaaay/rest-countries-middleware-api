import { createApp } from './app.js';
import { loadConfig } from './config.js';

// Entry point: the only place that reads config and opens a port
const config = loadConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
