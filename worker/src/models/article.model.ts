import type { D1Client } from '../utils/db';
import type { Article, ArticleWithDetails } from '../types';

export interface FindAllPublishedFilters {
  category?: number;
  district?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateArticleInput {
  title: string;
  content: string;
  category_id?: number | null;
  district_id?: number | null;
  journalist_id: number;
  status?: string;
}

export interface InsertScrapedInput {
  title: string;
  content: string;
  source_name: string;
  source_url: string;
  original_author: string;
  status?: string;
  llm_checked?: number;
}

export interface PaginatedArticles {
  articles: ArticleWithDetails[];
  total: number;
  page: number;
  limit: number;
}

export async function findAllPublished(
  db: D1Client,
  { category, district, search, page = 1, limit = 20 }: FindAllPublishedFilters
): Promise<PaginatedArticles> {
  const offset = (page - 1) * limit;
  let where = 'WHERE a.status = ?';
  const params: unknown[] = ['published'];

  if (category) {
    where += ' AND a.category_id = ?';
    params.push(category);
  }
  if (district) {
    where += ' AND a.district_id = ?';
    params.push(district);
  }
  if (search) {
    where += ' AND (a.title LIKE ? OR a.content LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const countRows = await db.all<{ total: number }>(
    `SELECT COUNT(*) AS total FROM articles a ${where}`,
    params
  );

  const articles = await db.all<ArticleWithDetails>(
    `SELECT a.*, c.category_name, d.district_name, j.journalist_id,
            u.full_name AS journalist_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.category_id
     LEFT JOIN districts d ON a.district_id = d.district_id
     LEFT JOIN journalists j ON a.journalist_id = j.journalist_id
     LEFT JOIN users u ON j.user_id = u.user_id
     ${where}
     ORDER BY a.published_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    articles,
    total: countRows[0]?.total ?? 0,
    page,
    limit,
  };
}

export async function findById(db: D1Client, id: number): Promise<ArticleWithDetails | null> {
  return db.first<ArticleWithDetails>(
    `SELECT a.*, c.category_name, d.district_name, j.journalist_id, u.full_name AS journalist_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.category_id
     LEFT JOIN districts d ON a.district_id = d.district_id
     LEFT JOIN journalists j ON a.journalist_id = j.journalist_id
     LEFT JOIN users u ON j.user_id = u.user_id
     WHERE a.article_id = ?`,
    [id]
  );
}

export async function create(db: D1Client, input: CreateArticleInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO articles (title, content, category_id, district_id, journalist_id, status, source_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      input.title,
      input.content,
      input.category_id ?? null,
      input.district_id ?? null,
      input.journalist_id,
      input.status ?? 'draft',
      'staff',
    ]
  );
  return result.meta.last_row_id ?? 0;
}

export async function update(
  db: D1Client,
  id: number,
  fields: Partial<Article>
): Promise<boolean> {
  const allowed: (keyof Article)[] = [
    'title',
    'content',
    'category_id',
    'district_id',
    'status',
    'llm_checked',
    'published_at',
    'cover_image_url',
    'cover_image_credit',
  ];
  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key as keyof Article)) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (updates.length === 0) return false;
  values.push(id);

  await db.run(`UPDATE articles SET ${updates.join(', ')} WHERE article_id = ?`, values);
  return true;
}

export async function findByJournalist(
  db: D1Client,
  journalistId: number
): Promise<ArticleWithDetails[]> {
  return db.all<ArticleWithDetails>(
    `SELECT a.*, c.category_name, d.district_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.category_id
     LEFT JOIN districts d ON a.district_id = d.district_id
     WHERE a.journalist_id = ?
     ORDER BY a.created_at DESC`,
    [journalistId]
  );
}

export async function findEditorQueue(db: D1Client): Promise<ArticleWithDetails[]> {
  return db.all<ArticleWithDetails>(
    `SELECT a.*, c.category_name, d.district_name, j.journalist_id, u.full_name AS journalist_name
     FROM articles a
     LEFT JOIN categories c ON a.category_id = c.category_id
     LEFT JOIN districts d ON a.district_id = d.district_id
     LEFT JOIN journalists j ON a.journalist_id = j.journalist_id
     LEFT JOIN users u ON j.user_id = u.user_id
     WHERE a.status = 'pending_review' AND a.llm_checked = 1
     ORDER BY a.created_at ASC`
  );
}

export async function findBySourceUrl(
  db: D1Client,
  sourceUrl: string
): Promise<Pick<Article, 'article_id'> | null> {
  return db.first<Pick<Article, 'article_id'>>(
    'SELECT article_id FROM articles WHERE source_url = ?',
    [sourceUrl]
  );
}

export async function insertScraped(db: D1Client, input: InsertScrapedInput): Promise<number> {
  const result = await db.run(
    'INSERT INTO articles (title, content, source_type, source_name, source_url, original_author, status, llm_checked, journalist_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)',
    [
      input.title,
      input.content,
      'scraped',
      input.source_name,
      input.source_url,
      input.original_author,
      input.status ?? 'pending_review',
      input.llm_checked ?? 0,
    ]
  );
  return result.meta.last_row_id ?? 0;
}

export async function countViews(db: D1Client, articleId: number): Promise<number> {
  const rows = await db.all<{ views: number }>(
    'SELECT COUNT(*) AS views FROM article_views WHERE article_id = ?',
    [articleId]
  );
  return rows[0]?.views ?? 0;
}

export async function addView(db: D1Client, articleId: number, userId?: number): Promise<void> {
  await db.run('INSERT INTO article_views (article_id, user_id) VALUES (?, ?)', [
    articleId,
    userId ?? null,
  ]);
}

export async function remove(db: D1Client, articleId: number): Promise<boolean> {
  await db.run('DELETE FROM articles WHERE article_id = ?', [articleId]);
  return true;
}
