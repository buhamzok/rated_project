import type { Context, ErrorHandler } from 'hono';
import { AppError, errorResponse } from '../utils/errors';
import type { Env } from '../types';

export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  console.error('[Worker Error]', err);
  if (err instanceof AppError) {
    return c.json(errorResponse(err.message, err.status, err.code), err.status as 400 | 401 | 403 | 404 | 409 | 422 | 500);
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return c.json(errorResponse(message, 500, 'INTERNAL_ERROR'), 500);
};
