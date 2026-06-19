import type { D1Client } from '../utils/db';
import type { Env } from '../types';
import * as articleModel from '../models/article.model';
import * as scrapedSourceModel from '../models/scrapedSource.model';
import { fetchFeeds, type FeedItem } from './fetchFeeds';
import { rewriteArticle } from '../services/llmRewrite.service';
import { getRandomStockImage } from '../services/stockImages.service';

export interface ScrapeSummary {
  fetched: number;
  inserted: number;
  skipped: number;
  errors: string[];
}

export async function runScrapeCycle(
  db: D1Client,
  env: Env,
  options: { categoryId?: number } = {}
): Promise<ScrapeSummary> {
  const summary: ScrapeSummary = {
    fetched: 0,
    inserted: 0,
    skipped: 0,
    errors: [],
  };

  try {
    const { items, errors } = await fetchFeeds(db);
    summary.fetched = items.length;

    for (const err of errors) {
      summary.errors.push(`${err.source}: ${err.error}`);
    }

    for (const item of items) {
      if (!item.title || !item.link) {
        continue;
      }

      const existing = await articleModel.findBySourceUrl(db, item.link);
      if (existing) {
        summary.skipped++;
        continue;
      }

      const rewritten = await rewriteArticle(env, {
        title: item.title,
        summary: item.summary,
        source_name: item.source_name,
      });

      const articleId = await articleModel.insertScraped(db, {
        title: rewritten.title,
        content: rewritten.content,
        source_name: item.source_name,
        source_url: item.link,
        original_author: item.original_author ?? '',
        status: 'pending_review',
        llm_checked: 1,
      });

      if (articleId && options.categoryId) {
        const stockImage = await getRandomStockImage(db, options.categoryId);
        await articleModel.update(db, articleId, {
          category_id: options.categoryId,
          cover_image_url: stockImage.image_url,
          cover_image_credit: stockImage.credit_text,
        });
      }

      summary.inserted++;
    }

    await scrapedSourceModel.update(
      db,
      summary.fetched > 0 ? 1 : 0,
      {}
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    summary.errors.push(`runScrapeCycle failed: ${message}`);
  }

  return summary;
}

export async function scrapeSingle(
  db: D1Client,
  env: Env,
  item: FeedItem,
  options: { categoryId?: number } = {}
): Promise<number | null> {
  const existing = await articleModel.findBySourceUrl(db, item.link);
  if (existing) return null;

  const rewritten = await rewriteArticle(env, {
    title: item.title,
    summary: item.summary,
    source_name: item.source_name,
  });

  const articleId = await articleModel.insertScraped(db, {
    title: rewritten.title,
    content: rewritten.content,
    source_name: item.source_name,
    source_url: item.link,
    original_author: item.original_author ?? '',
    status: 'pending_review',
    llm_checked: 1,
  });

  if (articleId && options.categoryId) {
    const stockImage = await getRandomStockImage(db, options.categoryId);
    await articleModel.update(db, articleId, {
      category_id: options.categoryId,
      cover_image_url: stockImage.image_url,
      cover_image_credit: stockImage.credit_text,
    });
  }

  return articleId;
}
