import { Hono } from 'hono';
import * as scraperController from '../controllers/scraper.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.post('/refresh', authenticate, requireRole('administrator', 'super_admin'), scraperController.refreshImages);

export default app;
