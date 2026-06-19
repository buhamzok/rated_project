import { Hono } from 'hono';
import * as districtController from '../controllers/district.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env, AuthenticatedUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

app.get('/', districtController.listDistricts);
app.post('/', authenticate, requireRole('administrator', 'super_admin'), districtController.createDistrict);

export default app;
