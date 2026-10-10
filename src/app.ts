import express, { type Express } from 'express';

// App factory: keeps the app free of side effects (no listen, no env reads)
// so integration tests can build it with a fake upstream client.
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  return app;
}
