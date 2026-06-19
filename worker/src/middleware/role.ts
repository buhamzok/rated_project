import type { MiddlewareHandler, Context } from 'hono';
import { AppError } from '../utils/errors';
import type { Env, AuthenticatedUser } from '../types';

export function requireRole(...allowedRoles: string[]): MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthenticatedUser } }> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      throw new AppError('Authentication required', 401, 'NO_USER');
    }
    const hasRole = user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      throw new AppError('You do not have permission to perform this action', 403, 'FORBIDDEN');
    }
    await next();
  };
}
