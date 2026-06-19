import type { D1Client } from '../utils/db';
import type { Admin } from '../types';

export async function findByUserId(db: D1Client, userId: number): Promise<Admin | null> {
  return db.first<Admin>('SELECT * FROM admin WHERE user_id = ?', [userId]);
}

export async function create(db: D1Client, userId: number): Promise<number> {
  const result = await db.run(
    'INSERT INTO admin (user_id, admin_level, permissions) VALUES (?, ?, NULL)',
    [userId, 'standard']
  );
  return result.meta.last_row_id ?? 0;
}
