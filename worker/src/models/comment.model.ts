import type { D1Client } from '../utils/db';
import type { Comment } from '../types';

export interface CreateCommentInput {
  article_id: number;
  user_id: number;
  comment_text: string;
}

export async function findByArticle(db: D1Client, articleId: number): Promise<Comment[]> {
  return db.all<Comment>(
    `SELECT c.*, u.full_name
     FROM comments c
     JOIN users u ON c.user_id = u.user_id
     WHERE c.article_id = ?
     ORDER BY c.created_at DESC`,
    [articleId]
  );
}

export async function create(db: D1Client, input: CreateCommentInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO comments (article_id, user_id, comment_text) VALUES (?, ?, ?)',
    [input.article_id, input.user_id, input.comment_text]
  );
  return result.meta.last_row_id ?? 0;
}
