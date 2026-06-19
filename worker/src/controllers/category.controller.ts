import type { Context } from 'hono';
import { z } from 'zod';
import * as categoryModel from '../models/category.model';
import * as adminModel from '../models/admin.model';
import { buildD1 } from '../utils/db';
import { AppError } from '../utils/errors';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const createCategorySchema = z.object({
  category_name: z.string().min(1),
  description: z.string().optional(),
});

export async function listCategories(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const categories = await categoryModel.findAll(db);
  return c.json({ data: categories });
}

export async function createCategory(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const body = await c.req.json();
  const parsed = createCategorySchema.parse(body);
  const db = buildD1(c.env.DB);

  const existing = await categoryModel.findByName(db, parsed.category_name);
  if (existing) throw new AppError('Category already exists', 409, 'CATEGORY_EXISTS');

  let adminId: number | null = null;
  const admin = await adminModel.findByUserId(db, user.user_id);
  if (admin) adminId = admin.admin_id;

  const categoryId = await categoryModel.create(db, {
    category_name: parsed.category_name,
    description: parsed.description,
    admin_id: adminId,
  });

  const category = await categoryModel.findById(db, categoryId);
  return c.json({ data: category }, 201);
}
