import type { D1Client } from '../utils/db';
import type { Editor } from '../types';

export async function findByUserId(db: D1Client, userId: number): Promise<Editor | null> {
  return db.first<Editor>('SELECT * FROM editors WHERE user_id = ?', [userId]);
}

export async function create(db: D1Client, userId: number): Promise<number> {
  const result = await db.run(
    'INSERT INTO editors (user_id, editor_level, department, approval_limit) VALUES (?, ?, NULL, NULL)',
    [userId, 'junior']
  );
  return result.meta.last_row_id ?? 0;
}
