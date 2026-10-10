import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, endpointNotFound, invalidParameter } from '../domain/errors.js';

// Reached only when no route matched: turn it into our standard 404
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(endpointNotFound(req.method, req.path));
};

// Express recognizes error handlers by their 4 arguments, so `_next` must stay
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const appError = toAppError(error);

  res.status(appError.status).json({
    error: { code: appError.code, message: appError.message },
  });
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Express itself rejects malformed URLs (e.g. "/countries/%E0%A4%A") with a 400
  if (isHttpClientError(error)) return invalidParameter('The request could not be parsed.');

  // Anything else is a bug: log the details here, never send them to the client
  console.error('[unexpected error]', error);
  return new AppError('INTERNAL_ERROR', 500, 'An unexpected error occurred.');
}

function isHttpClientError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  );
}
