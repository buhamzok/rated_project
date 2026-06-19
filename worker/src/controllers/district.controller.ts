import type { Context } from 'hono';
import { z } from 'zod';
import * as districtModel from '../models/district.model';
import * as adminModel from '../models/admin.model';
import { buildD1 } from '../utils/db';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const createDistrictSchema = z.object({
  district_name: z.string().min(1),
  region: z.string().optional(),
});

export async function listDistricts(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const districts = await districtModel.findAll(db);
  return c.json({ data: districts });
}

export async function createDistrict(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const body = await c.req.json();
  const parsed = createDistrictSchema.parse(body);
  const db = buildD1(c.env.DB);

  let adminId: number | null = null;
  const admin = await adminModel.findByUserId(db, user.user_id);
  if (admin) adminId = admin.admin_id;

  const districtId = await districtModel.create(db, {
    district_name: parsed.district_name,
    region: parsed.region,
    admin_id: adminId,
  });

  const district = await districtModel.findById(db, districtId);
  return c.json({ data: district }, 201);
}
