import { z } from 'zod';
import type { MiddlewareHandler, Context } from 'hono';
import { AppError } from '../utils/errors';
import type { Env, AuthenticatedUser } from '../types';

export function validateBody(schema: z.ZodTypeAny): MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthenticatedUser } }> {
  return async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new AppError('Invalid JSON body', 400, 'VALIDATION_ERROR');
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      throw new AppError(`Validation error: ${messages}`, 400, 'VALIDATION_ERROR');
    }
    c.set('validBody' as never, parsed.data as never);
    await next();
  };
}

export function getValidBody<T>(c: Context): T {
  return c.get('validBody' as never) as T;
}
