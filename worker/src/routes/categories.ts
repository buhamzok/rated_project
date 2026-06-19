import { Hono } from 'hono';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env, AuthenticatedUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

app.get('/', categoryController.listCategories);
app.post('/', authenticate, requireRole('administrator', 'super_admin'), categoryController.createCategory);

export default app;
