import type { Context } from 'hono';
import { z } from 'zod';
import * as scrapedSourceModel from '../models/scrapedSource.model';
import * as articleModel from '../models/article.model';
import * as stockImagesModel from '../models/stockImages.model';
import { runScrapeCycle } from '../scraper/scrapeRunner';
import { refreshAllCategories } from '../services/stockImages.service';
import { buildD1 } from '../utils/db';
import type { Env } from '../types';

const createSourceSchema = z.object({
  source_name: z.string().min(1),
  feed_url: z.string().min(1),
  site_url: z.string().optional(),
  is_active: z.boolean().optional(),
});

const updateSourceSchema = z.object({
  is_active: z.boolean(),
});

export async function listSources(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const sources = await scrapedSourceModel.findAll(db);
  return c.json({ data: sources });
}

export async function createSource(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = createSourceSchema.parse(body);
  const db = buildD1(c.env.DB);

  const result = await db.run(
    'INSERT INTO scraped_sources (source_name, feed_url, site_url, is_active) VALUES (?, ?, ?, ?)',
    [parsed.source_name, parsed.feed_url, parsed.site_url ?? null, parsed.is_active !== false]
  );

  const all = await scrapedSourceModel.findAll(db);
  const source = all.find((s) => s.source_id === (result.meta.last_row_id ?? 0));
  return c.json({ data: source }, 201);
}

export async function updateSource(c: Context<{ Bindings: Env }>) {
  const body = await c.req.json();
  const parsed = updateSourceSchema.parse(body);
  const db = buildD1(c.env.DB);
  const sourceId = Number(c.req.param('id'));

  await scrapedSourceModel.update(db, sourceId, { is_active: parsed.is_active ? 1 : 0 });
  const sources = await scrapedSourceModel.findAll(db);
  const source = sources.find((s) => s.source_id === sourceId);
  return c.json({ data: source });
}

export async function runScraper(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const summary = await runScrapeCycle(db, c.env);
  return c.json({ data: summary });
}

export async function getLastRun(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const last = await scrapedSourceModel.getLastRunSummary(db);
  return c.json({ data: last || { message: 'No scraper runs yet' } });
}

export async function refreshImages(c: Context<{ Bindings: Env }>) {
  const db = buildD1(c.env.DB);
  const summary = await refreshAllCategories(db, c.env);

  // Backfill published articles that still have no cover image
  let backfilled = 0;
  try {
    const { articles } = await articleModel.findAllPublished(db, { limit: 1000 });
    for (const article of articles) {
      if (article.cover_image_url || !article.category_id) continue;
      const image = await stockImagesModel.findRandomByCategory(db, article.category_id);
      if (!image) continue;
      await articleModel.update(db, article.article_id, {
        cover_image_url: image.image_url,
        cover_image_credit: image.credit_text,
        updated_at: new Date().toISOString(),
      });
      backfilled++;
    }
  } catch {
    // Backfill is best-effort; don't fail the whole refresh
  }

  return c.json({ data: { ...summary, backfilled } });
}
