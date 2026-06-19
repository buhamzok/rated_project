import type { Context } from 'hono';
import { z } from 'zod';
import * as commentModel from '../models/comment.model';
import { buildD1 } from '../utils/db';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const createCommentSchema = z.object({
  article_id: z.number().int(),
  comment_text: z.string().min(1),
});

export async function listComments(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const articleId = Number(c.req.param('articleId'));
  const comments = await commentModel.findByArticle(db, articleId);
  return c.json({ data: comments });
}

export async function createComment(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const body = await c.req.json();
  const parsed = createCommentSchema.parse(body);
  const db = buildD1(c.env.DB);

  const commentId = await commentModel.create(db, {
    article_id: parsed.article_id,
    user_id: user.user_id,
    comment_text: parsed.comment_text,
  });

  const comments = await commentModel.findByArticle(db, parsed.article_id);
  const comment = comments.find((c) => c.comment_id === commentId);
  return c.json({ data: comment }, 201);
}
