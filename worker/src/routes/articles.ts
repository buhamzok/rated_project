import { Hono } from 'hono';
import * as articleController from '../controllers/article.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import type { Env, AuthenticatedUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

app.get('/', articleController.listArticles);
app.get('/queue/editor', authenticate, requireRole('editor', 'super_admin'), articleController.getEditorQueue);
app.post('/', authenticate, requireRole('journalist', 'editor', 'super_admin'), articleController.createArticle);
app.get('/mine', authenticate, requireRole('journalist', 'editor', 'super_admin'), articleController.getMyArticles);
app.patch('/:id', authenticate, requireRole('journalist', 'editor', 'super_admin', 'administrator'), articleController.updateArticle);
app.delete('/:id', authenticate, requireRole('journalist', 'editor', 'super_admin', 'administrator'), articleController.deleteArticle);
app.post('/:id/submit', authenticate, requireRole('journalist', 'editor', 'super_admin'), articleController.submitArticle);
app.post('/:id/media', authenticate, requireRole('journalist', 'editor', 'super_admin'), articleController.uploadMedia);
app.post('/:id/review', authenticate, requireRole('editor', 'super_admin'), articleController.reviewArticle);
app.post('/:id/views', articleController.addView);
app.get('/:id', articleController.getArticle);

export default app;
