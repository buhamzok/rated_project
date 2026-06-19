import type { D1Client } from '../utils/db';
import type { Journalist } from '../types';

export async function findById(db: D1Client, id: number): Promise<Journalist | null> {
  return db.first<Journalist>('SELECT * FROM journalists WHERE journalist_id = ?', [id]);
}

export async function findByUserId(db: D1Client, userId: number): Promise<Journalist | null> {
  return db.first<Journalist>('SELECT * FROM journalists WHERE user_id = ?', [userId]);
}

export async function create(
  db: D1Client,
  userId: number,
  staffNumber: string,
  specialization: string | null = null,
  verificationStatus = 'pending'
): Promise<number> {
  const result = await db.run(
    'INSERT INTO journalists (user_id, staff_number, specialization, employment_date, verification_status) VALUES (?, ?, ?, date(\'now\'), ?)',
    [userId, staffNumber, specialization, verificationStatus]
  );
  return result.meta.last_row_id ?? 0;
}
