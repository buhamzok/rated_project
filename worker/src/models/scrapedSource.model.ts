import type { D1Client } from '../utils/db';
import type { ScrapedSource } from '../types';

export async function findAll(db: D1Client): Promise<ScrapedSource[]> {
  return db.all<ScrapedSource>('SELECT * FROM scraped_sources ORDER BY source_id');
}

export async function update(db: D1Client, sourceId: number, fields: Partial<Pick<ScrapedSource, 'feed_url' | 'is_active'>>): Promise<boolean> {
  const allowed = ['feed_url', 'is_active'];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) return false;
  values.push(sourceId);

  await db.run(
    `UPDATE scraped_sources SET ${updates.join(', ')} WHERE source_id = ?`,
    values
  );
  return true;
}

export async function getLastRunSummary(
  db: D1Client
): Promise<Pick<ScrapedSource, 'source_name' | 'last_scraped_at'> | null> {
  return db.first<Pick<ScrapedSource, 'source_name' | 'last_scraped_at'>>(
    'SELECT source_name, last_scraped_at FROM scraped_sources WHERE is_active = 1 ORDER BY last_scraped_at DESC LIMIT 1'
  );
}
