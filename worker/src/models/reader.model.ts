import type { D1Client } from '../utils/db';
import type { Reader } from '../types';

export async function findByUserId(db: D1Client, userId: number): Promise<Reader | null> {
  return db.first<Reader>('SELECT * FROM readers WHERE user_id = ?', [userId]);
}

export async function create(db: D1Client, userId: number): Promise<number> {
  const result = await db.run(
    'INSERT INTO readers (user_id, preferences, subscription_status) VALUES (?, NULL, ?)',
    [userId, 'free']
  );
  return result.meta.last_row_id ?? 0;
}
