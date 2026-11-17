/**
 * Data Dragon（ja_JP）からチャンピオン・アイテム・ルーン・サモナースペル・スキル名を引く。
 * 取得した JSON は data/ddragon/<version>/ja_JP/ にキャッシュする。
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.ts';

const BASE = 'https://ddragon.leagueoflegends.com';
const LOCALE = 'ja_JP';
const VERSIONS_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Data Dragon の取得に失敗: ${res.status} ${url}`);
  return res.json();
}

async function cachedJson(file: string, url: string, ttlMs?: number): Promise<any> {
  if (fs.existsSync(file)) {
    const fresh = ttlMs === undefined || Date.now() - fs.statSync(file).mtimeMs < ttlMs;
    if (fresh) return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  try {
    const data = await fetchJson(url);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data));
    return data;
  } catch (e) {
    // オフライン時は古いキャッシュでも使う
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    throw e;
  }
}

export async function getVersions(): Promise<string[]> {
  return cachedJson(path.join(config.ddragonDir, 'versions.json'), `${BASE}/api/versions.json`, VERSIONS_TTL_MS);
}

export async function getLatestVersion(): Promise<string> {
  return (await getVersions())[0];
}

type Named = { id: number; name: string };
type StaticSet = {
  version: string;
  champions: Map<number, { key: string; name: string }>;
  items: Map<number, string>;
  runes: Map<number, string>;
  styles: Map<number, string>;
  spells: Map<number, { key: string; name: string }>;
};

const staticCache = new Map<string, Promise<StaticSet>>();

function file(version: string, name: string) {
  return path.join(config.ddragonDir, version, LOCALE, name);
}
function url(version: string, name: string) {
  return `${BASE}/cdn/${version}/data/${LOCALE}/${name}`;
}

function loadStatic(version: string): Promise<StaticSet> {
  let p = staticCache.get(version);
  if (!p) {
    p = (async () => {
      const [champion, item, runes, summoner] = await Promise.all(
        ['champion.json', 'item.json', 'runesReforged.json', 'summoner.json'].map((n) =>
          cachedJson(file(version, n), url(version, n)),
        ),
      );
      const set: StaticSet = {
        version,
        champions: new Map(),
        items: new Map(),
        runes: new Map(),
        styles: new Map(),
        spells: new Map(),
      };
      for (const c of Object.values<any>(champion.data)) set.champions.set(Number(c.key), { key: c.id, name: c.name });
      for (const [id, it] of Object.entries<any>(item.data)) set.items.set(Number(id), it.name);
      for (const style of runes as any[]) {
        set.styles.set(style.id, style.name);
        for (const slot of style.slots) for (const r of slot.runes) set.runes.set(r.id, r.name);
      }
      for (const s of Object.values<any>(summoner.data)) set.spells.set(Number(s.key), { key: s.id, name: s.name });
      return set;
    })();
    staticCache.set(version, p);
  }
  return p;
}

/**
 * 名前解決器。基本は最新バージョンの ja_JP を使い、
 * 最新版で消えたID（旧アイテムなど）は試合当時のパッチ版で補う。
 */
export class Resolver {
  private constructor(
    private latest: StaticSet,
    private patchSet: StaticSet | null,
  ) {}

  static async create(patch?: string): Promise<Resolver> {
    const versions = await getVersions();
    const latest = await loadStatic(versions[0]);
    let patchSet: StaticSet | null = null;
    if (patch) {
      const v = versions.find((x) => x.startsWith(patch + '.'));
      if (v && v !== versions[0]) {
        try {
          patchSet = await loadStatic(v);
        } catch {
          patchSet = null;
        }
      }
    }
    return new Resolver(latest, patchSet);
  }

  get version() {
    return this.latest.version;
  }

  private pick<T>(get: (s: StaticSet) => T | undefined): T | undefined {
    return get(this.latest) ?? (this.patchSet ? get(this.patchSet) : undefined);
  }

  champion(id: number): { key: string; name: string } {
    return this.pick((s) => s.champions.get(id)) ?? { key: String(id), name: `不明なチャンピオン(${id})` };
  }
  item(id: number): string {
    return this.pick((s) => s.items.get(id)) ?? `不明なアイテム(${id})`;
  }
  rune(id: number): Named {
    return { id, name: this.pick((s) => s.runes.get(id)) ?? `不明なルーン(${id})` };
  }
  style(id: number): Named {
    return { id, name: this.pick((s) => s.styles.get(id)) ?? `不明なパス(${id})` };
  }
  spell(id: number): { id: number; key: string; name: string } {
    const s = this.pick((x) => x.spells.get(id));
    return { id, key: s?.key ?? String(id), name: s?.name ?? `不明なスペル(${id})` };
  }

  /** チャンピオンのスキル名（Q/W/E/R） */
  async skills(championKey: string): Promise<Record<'Q' | 'W' | 'E' | 'R', string>> {
    const v = this.latest.version;
    const name = `champion/${championKey}.json`;
    const data = await cachedJson(file(v, name), url(v, name));
    const spells = data.data[championKey].spells as any[];
    return { Q: spells[0].name, W: spells[1].name, E: spells[2].name, R: spells[3].name };
  }
}
