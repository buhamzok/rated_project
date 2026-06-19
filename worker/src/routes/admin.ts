import { Hono } from 'hono';
import * as adminController from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env, AuthenticatedUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

app.get('/users', authenticate, requireRole('administrator', 'super_admin'), adminController.listUsers);
app.get('/users/pending', authenticate, requireRole('administrator', 'super_admin'), adminController.listPendingUsers);
app.patch('/users/:id/approve', authenticate, requireRole('administrator', 'super_admin'), adminController.approveUser);
app.patch('/users/:id/roles', authenticate, requireRole('administrator', 'super_admin'), adminController.assignRole);
app.delete('/users/:id', authenticate, requireRole('administrator', 'super_admin'), adminController.deleteUser);

export default app;
