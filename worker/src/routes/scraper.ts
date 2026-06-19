import { Hono } from 'hono';
import * as scraperController from '../controllers/scraper.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.get('/sources', authenticate, requireRole('administrator', 'super_admin'), scraperController.listSources);
app.post('/sources', authenticate, requireRole('administrator', 'super_admin'), scraperController.createSource);
app.patch('/sources/:id', authenticate, requireRole('administrator', 'super_admin'), scraperController.updateSource);
app.post('/run', authenticate, requireRole('administrator', 'super_admin'), scraperController.runScraper);
app.get('/runs/last', authenticate, requireRole('administrator', 'super_admin'), scraperController.getLastRun);

export default app;
