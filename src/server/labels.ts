export const ROLE_LABEL: Record<string, string> = {
  TOP: 'トップ',
  JUNGLE: 'ジャングル',
  MIDDLE: 'ミッド',
  BOTTOM: 'ボット',
  UTILITY: 'サポート',
  UNKNOWN: '不明',
};
export const roleLabel = (r: string | null | undefined) => (r ? (ROLE_LABEL[r] ?? r) : '-');

export const MONSTER_TYPE: Record<string, string> = {
  DRAGON: 'ドラゴン',
  BARON_NASHOR: 'バロン',
  RIFTHERALD: 'ヘラルド',
  HORDE: 'ヴォイドグラブ',
  ATAKHAN: 'アタカン',
};

export const DRAGON_SUBTYPE: Record<string, string> = {
  FIRE_DRAGON: 'インファーナルドラゴン',
  EARTH_DRAGON: 'マウンテンドラゴン',
  WATER_DRAGON: 'オーシャンドラゴン',
  AIR_DRAGON: 'クラウドドラゴン',
  HEXTECH_DRAGON: 'ヘクステックドラゴン',
  CHEMTECH_DRAGON: 'ケミテックドラゴン',
  ELDER_DRAGON: 'エルダードラゴン',
};

export const LANE: Record<string, string> = { TOP_LANE: 'トップ', MID_LANE: 'ミッド', BOT_LANE: 'ボット' };
export const TOWER_TYPE: Record<string, string> = {
  OUTER_TURRET: 'アウタータワー',
  INNER_TURRET: 'インナータワー',
  BASE_TURRET: 'インヒビタータワー',
  NEXUS_TURRET: 'ネクサスタワー',
};

export const REVIEW_CATEGORIES = ['良かった点', '改善点', '次の目標'] as const;
export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number];

/** UNIX ミリ秒 → "YYYY-MM-DD HH:mm"（JST） */
export function toJst(ms: number): string {
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 16).replace('T', ' ');
}

export function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
