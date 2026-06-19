import type { D1Client } from '../utils/db';
import type { Category } from '../types';

export interface CreateCategoryInput {
  category_name: string;
  description?: string | null;
  admin_id?: number | null;
}

export async function findAll(db: D1Client): Promise<Category[]> {
  return db.all<Category>('SELECT * FROM categories ORDER BY category_name');
}

export async function findById(db: D1Client, id: number): Promise<Category | null> {
  return db.first<Category>('SELECT * FROM categories WHERE category_id = ?', [id]);
}

export async function create(db: D1Client, input: CreateCategoryInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO categories (category_name, description, admin_id) VALUES (?, ?, ?)',
    [input.category_name, input.description ?? null, input.admin_id ?? null]
  );
  return result.meta.last_row_id ?? 0;
}

export async function findByName(db: D1Client, name: string): Promise<Category | null> {
  return db.first<Category>('SELECT * FROM categories WHERE category_name = ?', [name]);
}
