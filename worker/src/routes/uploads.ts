import { Hono } from 'hono';
import * as uploadsController from '../controllers/uploads.controller';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.get('/:key', uploadsController.serveUpload);

export default app;
