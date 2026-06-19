import type { Context } from 'hono';
import { z } from 'zod';
import * as userModel from '../models/user.model';
import * as journalistModel from '../models/journalist.model';
import * as editorModel from '../models/editor.model';
import * as adminModel from '../models/admin.model';
import * as superAdminModel from '../models/superAdmin.model';
import * as readerModel from '../models/reader.model';
import { buildD1 } from '../utils/db';
import { AppError } from '../utils/errors';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const approveSchema = z.object({ role_name: z.string().optional() });
const assignRoleSchema = z.object({
  role_name: z.enum(['reader', 'journalist', 'editor', 'administrator', 'super_admin']),
  staff_number: z.string().optional(),
  specialization: z.string().optional(),
});

export async function listUsers(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const users = await userModel.findAll(db);
  return c.json({ data: users });
}

export async function listPendingUsers(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const users = await userModel.findAllPending(db);
  return c.json({ data: users });
}

export async function approveUser(c: Context<{ Bindings: Env }>) {
  const userId = Number(c.req.param('id'));
  const db = buildD1(c.env.DB);

  const user = await userModel.findById(db, userId);
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const roles = await userModel.getRoles(db, userId);
  if (!roles.includes('reader')) {
    await userModel.addRole(db, userId, 'reader');
    const hasReaderProfile = await readerModel.findByUserId(db, userId);
    if (!hasReaderProfile) await readerModel.create(db, userId);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = approveSchema.parse(body);
  if (parsed.role_name) {
    await userModel.addRole(db, userId, parsed.role_name);
  }

  return c.json({ message: 'User approved' });
}

export async function assignRole(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const currentUser = getUser(c);
  const targetUserId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = assignRoleSchema.parse(body);
  const db = buildD1(c.env.DB);

  const target = await userModel.findById(db, targetUserId);
  if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  if (parsed.role_name === 'super_admin' && !currentUser.roles.includes('super_admin')) {
    throw new AppError('Only super admins can assign super admin role', 403, 'FORBIDDEN');
  }

  await userModel.addRole(db, targetUserId, parsed.role_name);

  if (parsed.role_name === 'journalist') {
    const existing = await journalistModel.findByUserId(db, targetUserId);
    if (!existing) {
      await journalistModel.create(
        db,
        targetUserId,
        parsed.staff_number ?? '',
        parsed.specialization ?? null,
        'verified'
      );
    }
  } else if (parsed.role_name === 'editor') {
    const existing = await editorModel.findByUserId(db, targetUserId);
    if (!existing) {
      await editorModel.create(db, targetUserId);
    }
  } else if (parsed.role_name === 'administrator') {
    const existing = await adminModel.findByUserId(db, targetUserId);
    if (!existing) {
      await adminModel.create(db, targetUserId);
    }
  } else if (parsed.role_name === 'super_admin') {
    const existing = await superAdminModel.findByUserId(db, targetUserId);
    if (!existing) {
      await superAdminModel.create(db, targetUserId);
    }
  } else if (parsed.role_name === 'reader') {
    const existing = await readerModel.findByUserId(db, targetUserId);
    if (!existing) {
      await readerModel.create(db, targetUserId);
    }
  }

  return c.json({ message: `Role ${parsed.role_name} assigned` });
}

export async function deleteUser(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const currentUser = getUser(c);
  const targetUserId = Number(c.req.param('id'));
  const db = buildD1(c.env.DB);

  if (currentUser.user_id === targetUserId) {
    throw new AppError('You cannot delete your own account', 400, 'SELF_DELETE');
  }

  const target = await userModel.findById(db, targetUserId);
  if (!target) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const targetRoles = await userModel.getRoles(db, targetUserId);
  if (targetRoles.includes('super_admin') && !currentUser.roles.includes('super_admin')) {
    throw new AppError('Only super admins can delete super admins', 403, 'FORBIDDEN');
  }

  await userModel.remove(db, targetUserId);
  return c.json({ message: 'User deleted' });
}
