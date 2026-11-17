/**
 * Riot API クライアント（開発キーのレート制限 20req/1秒・100req/2分 を守る）
 */
import { config, requireApiKey } from './config.ts';

const LIMITS = [
  { max: 20, windowMs: 1_000 },
  { max: 100, windowMs: 120_000 },
];
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (msg: string) => process.stderr.write(msg + '\n');

export class RiotApiError extends Error {
  constructor(
    public status: number,
    public url: string,
    body: string,
  ) {
    super(`Riot API エラー ${status}: ${url}\n${body}`);
  }
}

export class RiotClient {
  private sent: number[] = [];
  private key = requireApiKey();

  /** 両方のウィンドウに空きができるまで待つ */
  private async throttle() {
    for (;;) {
      const now = Date.now();
      let waitMs = 0;
      for (const { max, windowMs } of LIMITS) {
        const inWindow = this.sent.filter((t) => now - t < windowMs);
        if (inWindow.length >= max) waitMs = Math.max(waitMs, inWindow[0] + windowMs - now + 50);
      }
      if (waitMs <= 0) break;
      if (waitMs > 2_000) log(`  レート制限のため ${Math.ceil(waitMs / 1000)} 秒待機中…`);
      await sleep(waitMs);
    }
    const now = Date.now();
    this.sent.push(now);
    this.sent = this.sent.filter((t) => now - t < 120_000);
  }

  async get<T = any>(host: string, pathAndQuery: string): Promise<T> {
    const url = `https://${host}.api.riotgames.com${pathAndQuery}`;
    for (let attempt = 0; ; attempt++) {
      await this.throttle();
      const res = await fetch(url, { headers: { 'X-Riot-Token': this.key } });
      if (res.ok) return (await res.json()) as T;
      if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
        const retryAfter = Number(res.headers.get('Retry-After'));
        const waitSec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt;
        log(`  ${res.status} を受信。${waitSec} 秒後に再試行します（${attempt + 1}/${MAX_RETRIES}）`);
        await sleep(waitSec * 1000);
        continue;
      }
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new RiotApiError(res.status, url, 'API キーが無効か期限切れです（開発キーは24時間で失効します）。\n' + body);
      }
      throw new RiotApiError(res.status, url, body);
    }
  }

  getAccount(gameName: string, tagLine: string) {
    return this.get<{ puuid: string; gameName: string; tagLine: string }>(
      config.region,
      `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    );
  }

  getMatchIds(puuid: string, opts: { start?: number; count?: number; startTime?: number; endTime?: number }) {
    const q = new URLSearchParams({ queue: String(config.queueId) });
    if (opts.start !== undefined) q.set('start', String(opts.start));
    if (opts.count !== undefined) q.set('count', String(opts.count));
    if (opts.startTime !== undefined) q.set('startTime', String(opts.startTime));
    if (opts.endTime !== undefined) q.set('endTime', String(opts.endTime));
    return this.get<string[]>(config.region, `/lol/match/v5/matches/by-puuid/${puuid}/ids?${q}`);
  }

  getMatch(matchId: string) {
    return this.get(config.region, `/lol/match/v5/matches/${matchId}`);
  }

  async getTimeline(matchId: string) {
    try {
      return await this.get(config.region, `/lol/match/v5/matches/${matchId}/timeline`);
    } catch (e) {
      if (e instanceof RiotApiError && e.status === 404) return null;
      throw e;
    }
  }
}
