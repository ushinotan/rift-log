/**
 * サモナーズリフトの座標まわり（サーバー・画面の両方から使う。DB などに依存しないこと）
 */

/** サモナーズリフトの座標範囲（Riot のマップ境界） */
export const MAP_BOUNDS = { min: [-120, -120], max: [14870, 14980] } as const;

export type Side = 'blue' | 'red';

export const sideOf = (teamId: number): Side => (teamId === 200 ? 'red' : 'blue');

/** 川（左上〜右下の対角線 x + y = RIVER_C）。マップの中心を通る */
export const RIVER_C = (MAP_BOUNDS.min[0] + MAP_BOUNDS.max[0] + MAP_BOUNDS.min[1] + MAP_BOUNDS.max[1]) / 2;

/**
 * レッド側の座標を「自陣が左下」に揃える。
 * 180° 回転だとトップレーン ↔ ボットレーン、バロン ↔ ドラゴンが入れ替わってしまうので、
 * 川の対角線で鏡映する（x' = C - y, y' = C - x）。これで自陣・敵陣だけが入れ替わり、
 * レーンとバロン/ドラゴンの位置はそのまま。
 */
export function normalizePos(x: number, y: number, side: Side): { x: number; y: number } {
  return side === 'red' ? { x: RIVER_C - y, y: RIVER_C - x } : { x, y };
}

export const ZONES = ['自陣ベース', '敵陣ベース', 'トップレーン', 'ミッドレーン', 'ボットレーン', '川', '自陣ジャングル', '敵陣ジャングル'] as const;
export type Zone = (typeof ZONES)[number];

/**
 * ベースの範囲。インヒビタータワー（≈ (1170, 4290), (3650, 3700), (4280, 1250)）の内側。
 * x・y それぞれの上限に加えて、ミッド側の角を x + y で落とす。座標はベースの角からの距離。
 */
const inBase = (dx: number, dy: number) => dx < 4300 && dy < 4300 && dx + dy < 7300;

/**
 * 大まかなエリア判定（簡易版）。座標は normalizePos 済み（自陣が左下）であること。
 * ベース → サイドレーン → ミッド → 川 → ジャングルの順に判定する。
 */
export function zoneOf(x: number, y: number): Zone {
  const [mx, my] = MAP_BOUNDS.max;
  if (inBase(x, y)) return '自陣ベース';
  if (inBase(mx - x, my - y)) return '敵陣ベース';
  if (x < 2100 || y > 12800) return 'トップレーン';
  if (y < 2100 || x > 12700) return 'ボットレーン';
  if (Math.abs(x - y) < 1300) return 'ミッドレーン';
  const d = x + y - RIVER_C; // 川からの距離の目安
  if (Math.abs(d) < 1500) return '川';
  return d < 0 ? '自陣ジャングル' : '敵陣ジャングル';
}
