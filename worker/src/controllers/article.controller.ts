import type { Context } from 'hono';
import { z } from 'zod';
import * as articleModel from '../models/article.model';
import * as journalistModel from '../models/journalist.model';
import * as mediaModel from '../models/media.model';
import * as editorialReviewModel from '../models/editorialReview.model';
import * as categoryModel from '../models/category.model';
import * as districtModel from '../models/district.model';
import * as stockImagesModel from '../models/stockImages.model';
import { refreshStockImagePool } from '../services/stockImages.service';
import * as llmValidation from '../services/llmValidation.service';
import { buildD1 } from '../utils/db';
import { AppError } from '../utils/errors';
import { getUser } from '../middleware/auth';
import type { Env, AuthenticatedUser } from '../types';

const articleCreateSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  category_id: z.number().int().optional(),
  district_id: z.number().int().optional(),
});

const articleUpdateSchema = z.object({
  title: z.string().min(3).optional(),
  content: z.string().min(10).optional(),
  category_id: z.number().int().optional(),
  district_id: z.number().int().optional(),
});

const submitSchema = z.object({});

const reviewSchema = z.object({
  decision: z.enum(['approved', 'returned', 'rejected']),
  feedback: z.string().optional(),
  category_id: z.number().int().optional(),
  district_id: z.number().int().optional(),
});

function parseQueryInt(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

export async function listArticles(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const query = c.req.query();
  const page = parseQueryInt(query.page) ?? 1;
  const limit = Math.min(parseQueryInt(query.limit) ?? 20, 100);
  const result = await articleModel.findAllPublished(db, {
    category: parseQueryInt(query.category),
    district: parseQueryInt(query.district),
    search: query.search,
    page,
    limit,
  });

  const articlesWithViews = await Promise.all(
    result.articles.map(async a => ({
      ...a,
      views: await articleModel.countViews(db, a.article_id),
    }))
  );

  return c.json({ data: { articles: articlesWithViews, total: result.total, page: result.page, limit: result.limit } });
}

export async function getArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const db = buildD1(c.env.DB);
  const articleId = Number(c.req.param('id'));
  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');

  const views = await articleModel.countViews(db, articleId);
  const user = c.get('user');
  if (article.status === 'published' && (!user || user.user_id !== article.journalist_id)) {
    await articleModel.addView(db, articleId, user?.user_id);
  }

  return c.json({ data: { ...article, views } });
}

export async function createArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const body = await c.req.json();
  const parsed = articleCreateSchema.parse(body);
  const db = buildD1(c.env.DB);

  const journalist = await journalistModel.findByUserId(db, user.user_id);
  if (!journalist) throw new AppError('Journalist profile not found', 403, 'NO_PROFILE');

  const articleId = await articleModel.create(db, {
    title: parsed.title,
    content: parsed.content,
    category_id: parsed.category_id,
    district_id: parsed.district_id,
    journalist_id: journalist.journalist_id,
  });

  const article = await articleModel.findById(db, articleId);
  return c.json({ data: article }, 201);
}

function hasAnyRole(user: AuthenticatedUser, ...roles: string[]): boolean {
  return user.roles.some((r) => roles.includes(r));
}

export async function updateArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const articleId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = articleUpdateSchema.parse(body);
  const db = buildD1(c.env.DB);

  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');

  const isEditorOrAdmin = hasAnyRole(user, 'editor', 'super_admin', 'administrator');
  const journalist = await journalistModel.findByUserId(db, user.user_id);

  if (!isEditorOrAdmin) {
    if (!journalist || article.journalist_id !== journalist.journalist_id) {
      throw new AppError('You can only edit your own articles', 403, 'FORBIDDEN');
    }
    if (!['draft', 'returned'].includes(article.status)) {
      throw new AppError('Only draft or returned articles can be edited', 409, 'INVALID_STATUS');
    }
  }

  await articleModel.update(db, articleId, {
    title: parsed.title,
    content: parsed.content,
    category_id: parsed.category_id,
    district_id: parsed.district_id,
    updated_at: new Date().toISOString(),
  });

  const updated = await articleModel.findById(db, articleId);
  return c.json({ data: updated });
}

export async function deleteArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const articleId = Number(c.req.param('id'));
  const db = buildD1(c.env.DB);

  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');

  const isEditorOrAdmin = hasAnyRole(user, 'editor', 'super_admin', 'administrator');
  const journalist = await journalistModel.findByUserId(db, user.user_id);

  if (!isEditorOrAdmin) {
    if (!journalist || article.journalist_id !== journalist.journalist_id) {
      throw new AppError('You can only delete your own articles', 403, 'FORBIDDEN');
    }
  }

  await articleModel.remove(db, articleId);
  return c.json({ message: 'Article deleted' });
}

export async function submitArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const articleId = Number(c.req.param('id'));
  const db = buildD1(c.env.DB);

  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');

  const journalist = await journalistModel.findByUserId(db, user.user_id);
  if (!journalist || article.journalist_id !== journalist.journalist_id) {
    throw new AppError('You can only submit your own articles', 403, 'FORBIDDEN');
  }

  await articleModel.update(db, articleId, { status: 'pending_review', updated_at: new Date().toISOString() });

  const validation = await llmValidation.validateArticle(c.env, {
    title: article.title,
    content: article.content,
  });

  if (!validation.valid) {
    await articleModel.update(db, articleId, { status: 'rejected', updated_at: new Date().toISOString() });
    await editorialReviewModel.create(db, {
      article_id: articleId,
      review_status: 'auto_rejected',
      feedback: validation.reason,
      reviewer_id: undefined,
    });
    return c.json({ message: 'Article rejected by automated check', reason: validation.reason }, 422);
  }

  await articleModel.update(db, articleId, { llm_checked: 1, updated_at: new Date().toISOString() });
  return c.json({ message: 'Article submitted for review' });
}

export async function uploadMedia(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const articleId = Number(c.req.param('id'));
  const db = buildD1(c.env.DB);

  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');

  const journalist = await journalistModel.findByUserId(db, user.user_id);
  if (!journalist || article.journalist_id !== journalist.journalist_id) {
    throw new AppError('You can only upload media to your own articles', 403, 'FORBIDDEN');
  }

  const contentType = c.req.header('Content-Type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    throw new AppError('Expected multipart/form-data', 400, 'VALIDATION_ERROR');
  }

  const formData = await c.req.parseBody({ all: false });
  const file = formData.file;
  if (!(file instanceof File)) {
    throw new AppError('No file provided', 400, 'VALIDATION_ERROR');
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new AppError('File exceeds 10 MB limit', 400, 'VALIDATION_ERROR');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const publicUrl = `${c.req.url.split('/api')[0]}/${key}`;
  await mediaModel.create(db, { file_url: publicUrl, media_type: file.type || null, article_id: articleId });

  if (article.source_type === 'staff' && !article.cover_image_url) {
    await articleModel.update(db, articleId, { cover_image_url: publicUrl, updated_at: new Date().toISOString() });
  }

  return c.json({ data: { file_url: publicUrl } });
}

export async function getMyArticles(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const db = buildD1(c.env.DB);
  const journalist = await journalistModel.findByUserId(db, user.user_id);
  if (!journalist) return c.json({ data: [] });
  const articles = await articleModel.findByJournalist(db, journalist.journalist_id);
  return c.json({ data: articles });
}

export async function getEditorQueue(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const articles = await articleModel.findEditorQueue(db);
  const withViews = await Promise.all(
    articles.map(async a => ({ ...a, views: await articleModel.countViews(db, a.article_id) }))
  );
  return c.json({ data: withViews });
}

export async function reviewArticle(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const user = getUser(c);
  const articleId = Number(c.req.param('id'));
  const body = await c.req.json();
  const parsed = reviewSchema.parse(body);
  const db = buildD1(c.env.DB);

  const article = await articleModel.findById(db, articleId);
  if (!article) throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
  if (article.status !== 'pending_review') {
    throw new AppError('Article is not pending review', 409, 'INVALID_STATUS');
  }
  if (article.source_type === 'scraped' && parsed.decision === 'returned') {
    throw new AppError('Scraped articles cannot be returned', 409, 'INVALID_STATUS');
  }

  let updateFields: Partial<import('../types').Article> = { updated_at: new Date().toISOString() };
  if (parsed.category_id) updateFields.category_id = parsed.category_id;
  if (parsed.district_id) updateFields.district_id = parsed.district_id;

  if (parsed.decision === 'approved') {
    if (article.source_type === 'scraped' && !parsed.category_id && !article.category_id) {
      throw new AppError('Scraped articles require a category before approval', 400, 'VALIDATION_ERROR');
    }
    if (!article.cover_image_url) {
      const categoryId = parsed.category_id ?? article.category_id ?? 1;
      let image = await stockImagesModel.findRandomByCategory(db, categoryId);
      if (!image) {
        const categoryName = article.category_name || (await categoryModel.findById(db, categoryId))?.category_name;
        if (categoryName) {
          await refreshStockImagePool(db, c.env, categoryName);
          image = await stockImagesModel.findRandomByCategory(db, categoryId);
        }
      }
      if (image) {
        updateFields.cover_image_url = image.image_url;
        updateFields.cover_image_credit = image.credit_text;
      }
    }
    updateFields.status = 'published';
    updateFields.published_at = new Date().toISOString();
  } else if (parsed.decision === 'returned') {
    updateFields.status = 'returned';
  } else {
    updateFields.status = 'rejected';
  }

  await articleModel.update(db, articleId, updateFields);
  await editorialReviewModel.create(db, {
    article_id: articleId,
    review_status: parsed.decision,
    feedback: parsed.feedback,
    reviewer_id: user.user_id,
  });

  return c.json({ message: `Article ${parsed.decision}` });
}

export async function addView(c: Context<{ Bindings: Env; Variables: { user: AuthenticatedUser } }>) {
  const articleId = Number(c.req.param('id'));
  const user = c.get('user');
  const db = buildD1(c.env.DB);
  await articleModel.addView(db, articleId, user?.user_id);
  return c.json({ message: 'View recorded' });
}
