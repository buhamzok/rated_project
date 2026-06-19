import type { D1Client } from '../utils/db';
import type { Media } from '../types';

export interface CreateMediaInput {
  article_id: number;
  file_url: string;
  media_type?: string | null;
}

export async function create(db: D1Client, input: CreateMediaInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO media (article_id, file_url, media_type) VALUES (?, ?, ?)',
    [input.article_id, input.file_url, input.media_type ?? null]
  );
  return result.meta.last_row_id ?? 0;
}

export async function findByArticle(db: D1Client, articleId: number): Promise<Media[]> {
  return db.all<Media>(
    'SELECT * FROM media WHERE article_id = ? ORDER BY uploaded_at ASC',
    [articleId]
  );
}
