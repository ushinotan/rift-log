/**
 * ローカル Web アプリ用の JSON API（Vite 開発サーバーのミドルウェアとして動く）
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getFilterOptions, getMatchDetail, getTrends, listMatches, summarize } from './queries.ts';
import { getLatestVersion } from './ddragon.ts';

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

export async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const p = url.pathname.replace(/^\/api/, '');
  try {
    if (p === '/matches') {
      const q = url.searchParams;
      const rows = await listMatches({
        result: q.get('result') || undefined,
        champion: q.get('champion') || undefined,
        role: q.get('role') || undefined,
      });
      return send(res, 200, { rows, summary: summarize(rows), options: await getFilterOptions() });
    }
    const m = p.match(/^\/matches\/([^/]+)$/);
    if (m) {
      const d = await getMatchDetail(decodeURIComponent(m[1]));
      return d ? send(res, 200, d) : send(res, 404, { error: '試合が見つかりません' });
    }
    if (p === '/trends') return send(res, 200, await getTrends());
    if (p === '/ddragon') return send(res, 200, { version: await getLatestVersion().catch(() => null) });
    send(res, 404, { error: 'not found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}
