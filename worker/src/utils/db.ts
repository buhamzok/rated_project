import type { D1Database, D1Result } from '@cloudflare/workers-types';

export function buildD1(db: D1Database) {
  return {
    async first<T = unknown>(sql: string, params?: unknown[]): Promise<T | null> {
      const stmt = db.prepare(sql).bind(...(params ?? []));
      const row = await stmt.first();
      return (row as T) ?? null;
    },

    async all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
      const stmt = db.prepare(sql).bind(...(params ?? []));
      const { results } = await stmt.all();
      return (results ?? []) as T[];
    },

    async run(sql: string, params?: unknown[]): Promise<D1Result> {
      const stmt = db.prepare(sql).bind(...(params ?? []));
      return stmt.run();
    },

    async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
      return db.batch(statements);
    },

    prepare(sql: string) {
      return db.prepare(sql);
    },
  };
}

export type D1Client = ReturnType<typeof buildD1>;
