import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error';

import authRoutes from './routes/auth';
import articleRoutes from './routes/articles';
import categoryRoutes from './routes/categories';
import districtRoutes from './routes/districts';
import commentRoutes from './routes/comments';
import adminRoutes from './routes/admin';
import scraperRoutes from './routes/scraper';
import imageRoutes from './routes/images';
import uploadsRoutes from './routes/uploads';

import { runScrapeCycle } from './scraper/scrapeRunner';
import { refreshAllCategories } from './services/stockImages.service';
import { buildD1 } from './utils/db';
import type { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

app.get('/api/health', (c) => c.json({ status: 'success', message: 'Rated Uganda API is running' }));

app.route('/api/auth', authRoutes);
app.route('/api/articles', articleRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/districts', districtRoutes);
app.route('/api/comments', commentRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/admin/scraper', scraperRoutes);
app.route('/api/admin/images', imageRoutes);
app.route('/uploads', uploadsRoutes);

app.onError(errorHandler);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = buildD1(env.DB);

    if (event.cron === '0 * * * *') {
      ctx.waitUntil(runScrapeCycle(db, env));
    } else if (event.cron === '0 0 * * *') {
      ctx.waitUntil(refreshAllCategories(db, env));
    }
  },
};
