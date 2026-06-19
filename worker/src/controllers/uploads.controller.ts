import type { Context } from 'hono';
import { buildD1 } from '../utils/db';
import type { Env } from '../types';

export async function serveUpload(c: Context<{ Bindings: Env }>) {
  const key = c.req.param('key');
  if (!key) return c.notFound();

  const fullKey = `uploads/${key}`;
  const object = await c.env.UPLOADS.get(fullKey);
  if (!object) return c.notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
