import type { D1Client } from '../utils/db';
import type { Env } from '../types';
import * as stockImageModel from '../models/stockImages.model';

export interface StockImageSummary {
  refreshed: number;
  errors: string[];
}

export interface StockImageRecord {
  image_url: string;
  thumbnail_url: string;
  credit_text: string | null;
}

const SEARCH_TERMS: Record<string, string> = {
  Politics: 'Uganda parliament politics',
  Business: 'Uganda economy market',
  Sports: 'Uganda football sports',
  Technology: 'Africa technology office',
  Health: 'Uganda hospital health',
};

let warned = false;

function warnOnce(message: string): void {
  if (!warned) {
    console.warn('[Stock Images]', message);
    warned = true;
  }
}

interface PexelsPhoto {
  photographer?: string;
  src?: {
    large?: string;
    medium?: string;
    small?: string;
  };
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

export async function refreshStockImagePool(
  db: D1Client,
  env: Env,
  categoryName: string
): Promise<StockImageSummary> {
  const apiKey = env.PEXELS_API_KEY || '';

  if (!apiKey) {
    warnOnce('PEXELS_API_KEY not configured. Using placeholder fallback.');
    return { refreshed: 0, errors: ['PEXELS_API_KEY not configured'] };
  }

  const category = await stockImageModel.findByCategoryName(db, categoryName);
  if (!category) {
    return { refreshed: 0, errors: [`Category ${categoryName} not found`] };
  }

  const categoryId = category.category_id;
  const term = SEARCH_TERMS[categoryName] || categoryName;

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&per_page=10`,
      {
        headers: { Authorization: apiKey },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API returned ${response.status}`);
    }

    const json = (await response.json()) as PexelsResponse;
    const photos = json.photos || [];

    await stockImageModel.deleteByCategoryId(db, categoryId);

    let inserted = 0;
    for (const photo of photos) {
      const large = photo.src?.large;
      if (!large) continue;

      await stockImageModel.insert(db, {
        category_id: categoryId,
        image_url: large,
        thumbnail_url: photo.src?.medium || photo.src?.small || large,
        credit_text: `Photo: ${photo.photographer || 'Unknown'} on Pexels`,
        source_provider: 'pexels',
      });
      inserted++;
    }

    return { refreshed: inserted, errors: [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { refreshed: 0, errors: [message] };
  }
}

export async function refreshAllCategories(
  db: D1Client,
  env: Env
): Promise<StockImageSummary> {
  const categories = await stockImageModel.findAllCategories(db);
  let total = 0;
  const errors: string[] = [];

  for (const cat of categories) {
    const result = await refreshStockImagePool(db, env, cat.category_name);
    total += result.refreshed;
    errors.push(...result.errors);
  }

  return { refreshed: total, errors };
}

export async function getRandomStockImage(
  db: D1Client,
  categoryId?: number | null
): Promise<StockImageRecord> {
  if (!categoryId) {
    return {
      image_url: '/assets/placeholder-cover.jpg',
      thumbnail_url: '/assets/placeholder-cover.jpg',
      credit_text: null,
    };
  }

  const row = await stockImageModel.findRandomByCategory(db, categoryId);
  if (!row) {
    return {
      image_url: '/assets/placeholder-cover.jpg',
      thumbnail_url: '/assets/placeholder-cover.jpg',
      credit_text: null,
    };
  }

  return {
    image_url: row.image_url,
    thumbnail_url: row.thumbnail_url,
    credit_text: row.credit_text,
  };
}
