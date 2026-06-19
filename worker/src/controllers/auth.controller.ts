import type { Context } from 'hono';
import { z } from 'zod';
import * as userModel from '../models/user.model';
import * as readerModel from '../models/reader.model';
import { hashPassword, comparePassword, signToken } from '../services/auth.service';
import { buildD1 } from '../utils/db';
import { AppError } from '../utils/errors';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone_number: z.string().optional(),
});

export async function login(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = loginSchema.parse(body);
  const db = buildD1(c.env.DB);

  const user = await userModel.findByEmail(db, parsed.email);
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const valid = await comparePassword(parsed.password, user.password);
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  const roles = await userModel.getRoles(db, user.user_id);
  const token = await signToken(
    { user_id: user.user_id, email: user.email, full_name: user.full_name },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN
  );

  return c.json({
    token,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      phone_number: user.phone_number,
      profile_picture: user.profile_picture,
      roles,
    },
  });
}

export async function register(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = registerSchema.parse(body);
  const db = buildD1(c.env.DB);

  const existing = await userModel.findByEmail(db, parsed.email);
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

  const passwordHash = await hashPassword(parsed.password);
  const userId = await userModel.create(db, {
    full_name: parsed.full_name,
    email: parsed.email,
    password: passwordHash,
    phone_number: parsed.phone_number,
  });

  await userModel.addRole(db, userId, 'reader');
  await readerModel.create(db, userId);

  const roles = await userModel.getRoles(db, userId);
  const token = await signToken(
    { user_id: userId, email: parsed.email, full_name: parsed.full_name },
    c.env.JWT_SECRET,
    c.env.JWT_EXPIRES_IN
  );

  return c.json({
    token,
    user: {
      user_id: userId,
      full_name: parsed.full_name,
      email: parsed.email,
      roles,
    },
  }, 201);
}

export async function me(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const db = buildD1(c.env.DB);
  const full = await userModel.findById(db, user.user_id);
  const roles = await userModel.getRoles(db, user.user_id);
  return c.json({
    user: {
      user_id: user.user_id,
      full_name: full?.full_name ?? user.full_name,
      email: full?.email ?? user.email,
      phone_number: full?.phone_number,
      profile_picture: full?.profile_picture,
      roles,
    },
  });
}
