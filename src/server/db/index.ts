import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { config, ROOT } from '../config.ts';
import * as schema from './schema.ts';

export type DB = Awaited<ReturnType<typeof openDb>>;

let cached: Promise<ReturnType<typeof make>> | null = null;

function make() {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const client = createClient({ url: pathToFileURL(config.dbPath).href });
  return drizzle(client, { schema });
}

export function openDb() {
  cached ??= (async () => {
    const db = make();
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');
    await migrate(db, { migrationsFolder: path.join(ROOT, 'drizzle') });
    return db;
  })();
  return cached;
}

export { schema };
