import type { D1Client } from '../utils/db';
import type { EditorialReview } from '../types';

export interface CreateEditorialReviewInput {
  article_id: number;
  review_status: string;
  feedback?: string | null;
  reviewer_id?: number | null;
}

export async function create(db: D1Client, input: CreateEditorialReviewInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO editorial_reviews (article_id, review_status, feedback, reviewer_id) VALUES (?, ?, ?, ?)',
    [input.article_id, input.review_status, input.feedback ?? null, input.reviewer_id ?? null]
  );
  return result.meta.last_row_id ?? 0;
}
