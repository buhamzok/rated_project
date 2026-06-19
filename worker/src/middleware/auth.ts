import type { MiddlewareHandler, Context } from 'hono';
import { verifyToken } from '../services/auth.service';
import * as userModel from '../models/user.model';
import { buildD1 } from '../utils/db';
import { AppError } from '../utils/errors';
import type { Env, AuthenticatedUser } from '../types';

export const authenticate: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthenticatedUser } }> = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'NO_TOKEN');
  }
  const token = header.slice(7);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    const db = buildD1(c.env.DB);
    const user = await userModel.findByIdWithPassword(db, payload.user_id);
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }
    const roles = await userModel.getRoles(db, payload.user_id);
    c.set('user', {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      roles,
    });
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
  }
};

export function getUser(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>): AuthenticatedUser {
  const user = c.get('user');
  if (!user) throw new AppError('Authentication required', 401, 'NO_USER');
  return user;
}
