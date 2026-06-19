import { Hono } from 'hono';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import type { Env } from '../types';

const app = new Hono<{ Bindings: Env }>();

app.post('/register', authController.register);
app.post('/login', authController.login);
app.get('/me', authenticate, authController.me);

export default app;
