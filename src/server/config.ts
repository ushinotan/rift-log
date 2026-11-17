import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = path.join(ROOT, 'data');

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // .env がなくても DB の閲覧だけならできる
}

export const config = {
  gameName: process.env.RIOT_GAME_NAME || '牛乃タン',
  tagLine: process.env.RIOT_TAG_LINE || 'SION',
  platform: 'jp1',
  region: 'asia',
  queueId: 420,
  dbPath: process.env.RIFT_LOG_DB || path.join(DATA_DIR, 'rift-log.db'),
  ddragonDir: path.join(DATA_DIR, 'ddragon'),
};

export function requireApiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    throw new Error('RIOT_API_KEY が設定されていません。.env.example を .env にコピーして API キーを書いてください。');
  }
  return key;
}
