import type { D1Client } from '../utils/db';
import type { SuperAdmin } from '../types';

export async function findByUserId(db: D1Client, userId: number): Promise<SuperAdmin | null> {
  return db.first<SuperAdmin>('SELECT * FROM super_admin WHERE user_id = ?', [userId]);
}

export async function create(db: D1Client, userId: number): Promise<number> {
  const result = await db.run(
    'INSERT INTO super_admin (user_id, access_level, system_permissions) VALUES (?, ?, NULL)',
    [userId, 'full']
  );
  return result.meta.last_row_id ?? 0;
}
