import { Hono } from 'hono';
import * as commentController from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>();

app.get('/:articleId', commentController.listComments);
app.post('/', authenticate, commentController.createComment);

export default app;
