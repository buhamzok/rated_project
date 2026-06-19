import type { D1Client } from '../utils/db';

export interface StockImageRow {
  image_id: number;
  category_id: number;
  image_url: string;
  thumbnail_url: string;
  credit_text: string;
  source_provider: string;
  fetched_at: string;
}

export async function findByCategoryName(
  db: D1Client,
  categoryName: string
): Promise<{ category_id: number } | null> {
  return db.first<{ category_id: number }>(
    'SELECT category_id FROM categories WHERE category_name = ?',
    [categoryName]
  );
}

export async function deleteByCategoryId(
  db: D1Client,
  categoryId: number
): Promise<void> {
  await db.run('DELETE FROM stock_images WHERE category_id = ?', [categoryId]);
}

export async function insert(
  db: D1Client,
  input: Omit<StockImageRow, 'image_id' | 'fetched_at'>
): Promise<number> {
  const result = await db.run(
    'INSERT INTO stock_images (category_id, image_url, thumbnail_url, credit_text, source_provider) VALUES (?, ?, ?, ?, ?)',
    [
      input.category_id,
      input.image_url,
      input.thumbnail_url,
      input.credit_text,
      input.source_provider,
    ]
  );
  return result.meta.last_row_id ?? 0;
}

export async function findAllCategories(db: D1Client): Promise<
  { category_id: number; category_name: string }[]
> {
  return db.all<{ category_id: number; category_name: string }>(
    'SELECT category_id, category_name FROM categories ORDER BY category_name'
  );
}

export async function findRandomByCategory(
  db: D1Client,
  categoryId: number
): Promise<Pick<StockImageRow, 'image_url' | 'thumbnail_url' | 'credit_text'> | null> {
  return db.first<Pick<StockImageRow, 'image_url' | 'thumbnail_url' | 'credit_text'>>(
    'SELECT image_url, thumbnail_url, credit_text FROM stock_images WHERE category_id = ? ORDER BY RANDOM() LIMIT 1',
    [categoryId]
  );
}
