import type { D1Client } from '../utils/db';
import seedSources from './sources';

export interface VerifyResult {
  source_name: string;
  feed_url: string;
  active: boolean;
  itemCount: number;
  error?: string;
}

export async function verifySources(db: D1Client): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];

  for (const source of seedSources) {
    try {
      const response = await fetch(source.feed_url, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const hasItems = xml.includes('<item') || xml.includes('<entry');
      const active = hasItems;

      await db.run(
        'UPDATE scraped_sources SET feed_url = ?, is_active = ?, last_scraped_at = datetime("now") WHERE source_name = ?',
        [source.feed_url, active ? 1 : 0, source.source_name]
      );

      results.push({
        source_name: source.source_name,
        feed_url: source.feed_url,
        active,
        itemCount: active ? 1 : 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      await db.run(
        'UPDATE scraped_sources SET feed_url = ?, is_active = 0 WHERE source_name = ?',
        [source.feed_url, source.source_name]
      );

      results.push({
        source_name: source.source_name,
        feed_url: source.feed_url,
        active: false,
        itemCount: 0,
        error: message,
      });
    }
  }

  return results;
}
