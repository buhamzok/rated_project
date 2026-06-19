import { XMLParser } from 'fast-xml-parser';
import type { D1Client } from '../utils/db';

const ALWAYS_ARRAY = new Set([
  'rss.channel.item',
  'feed.entry',
  'rdf:RDF.item',
  'RDF.item',
]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  isArray: (name, jpath) => ALWAYS_ARRAY.has(jpath),
});

export interface FeedItem {
  title: string;
  summary: string;
  link: string;
  pubDate: string | null;
  original_author: string | null;
  source_name: string;
  source_id: number;
}

export interface FetchFeedsResult {
  items: FeedItem[];
  errors: { source: string; error: string }[];
}

function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^\u003e]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const text = (value as Record<string, unknown>)['#text'];
    return typeof text === 'string' ? text : String(value);
  }
  return String(value);
}

function normalizeItems(raw: unknown): Array<Record<string, unknown>> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (typeof raw === 'object') return [raw as Record<string, unknown>];
  return [];
}

function extractItems(xmlObj: unknown): Array<Record<string, unknown>> {
  const obj = xmlObj as Record<string, unknown> | undefined;
  if (!obj) return [];

  if (obj.rss) {
    const channel = (obj.rss as Record<string, unknown>).channel as Record<string, unknown> | undefined;
    return normalizeItems(channel?.item);
  }

  if (obj.feed) {
    return normalizeItems((obj.feed as Record<string, unknown>).entry);
  }

  if (obj['rdf:RDF']) {
    return normalizeItems((obj['rdf:RDF'] as Record<string, unknown>).item);
  }

  if (obj.RDF) {
    return normalizeItems((obj.RDF as Record<string, unknown>).item);
  }

  return [];
}

function extractLink(item: Record<string, unknown>): string {
  const linkValue = item.link;
  if (typeof linkValue === 'string') return linkValue.trim();
  if (typeof linkValue === 'object' && linkValue !== null) {
    const href = (linkValue as Record<string, unknown>)['@_href'];
    if (typeof href === 'string') return href.trim();
  }
  return '';
}

export async function fetchFeeds(db: D1Client): Promise<FetchFeedsResult> {
  const sources = await db.all<{
    source_id: number;
    source_name: string;
    feed_url: string;
  }>(
    'SELECT source_id, source_name, feed_url FROM scraped_sources WHERE is_active = 1 ORDER BY source_id'
  );

  const allItems: FeedItem[] = [];
  const errors: { source: string; error: string }[] = [];

  for (const source of sources) {
    try {
      const response = await fetch(source.feed_url, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const parsed = xmlParser.parse(xml);
      const rawItems = extractItems(parsed).slice(0, 20);

      const items: FeedItem[] = rawItems.map((item) => ({
        title: getText(item.title).trim(),
        summary: stripHtml(
          getText(item.description || item.summary || item.content || item['content:encoded'])
        ),
        link: extractLink(item),
        pubDate: getText(item.pubDate || item.published || item.isoDate || item.updated).trim() || null,
        original_author:
          getText(item.author || item.creator || item['dc:creator'] || item['dc:author']).trim() || null,
        source_name: source.source_name,
        source_id: source.source_id,
      }));

      allItems.push(...items);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ source: source.source_name, error: message });
    }
  }

  return { items: allItems, errors };
}
