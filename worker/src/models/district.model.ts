import type { D1Client } from '../utils/db';
import type { District } from '../types';

export interface CreateDistrictInput {
  district_name: string;
  region?: string | null;
  admin_id?: number | null;
}

export async function findAll(db: D1Client): Promise<District[]> {
  return db.all<District>('SELECT * FROM districts ORDER BY district_name');
}

export async function findById(db: D1Client, id: number): Promise<District | null> {
  return db.first<District>('SELECT * FROM districts WHERE district_id = ?', [id]);
}

export async function create(db: D1Client, input: CreateDistrictInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO districts (district_name, region, admin_id) VALUES (?, ?, ?)',
    [input.district_name, input.region ?? null, input.admin_id ?? null]
  );
  return result.meta.last_row_id ?? 0;
}
