import { useState } from 'react';
import type { DeathPoint } from '../server/deathmap.ts';
import { normalizePos } from '../server/map.ts';
import { mmss, navigate } from './lib.tsx';

export type { DeathPoint };
export type Bounds = { min: readonly number[]; max: readonly number[] };

/** 時間帯（順序のあるデータなので単色相の濃淡で表す） */
export const TIME_BANDS = [
  { key: 'early', label: '序盤（〜14分）', until: 14 * 60, color: 'var(--dm-early)' },
  { key: 'mid', label: '中盤（14〜25分）', until: 25 * 60, color: 'var(--dm-mid)' },
  { key: 'late', label: '終盤（25分〜）', until: Infinity, color: 'var(--dm-late)' },
] as const;
export const bandOf = (sec: number) => TIME_BANDS.find((b) => sec < b.until)!;

/** 1対1か（デス: 関与した敵が1人以下 / キル: 自分だけで倒した） */
export const isSolo = (p: DeathPoint) => (p.kind === 'death' ? p.enemyCount <= 1 : p.allyCount <= 1);

export function describePoint(p: DeathPoint, withMatch = true) {
  const t = mmss(p.timeSec);
  const tail = withMatch ? `（${p.matchId} / ${p.result}）` : '';
  if (p.kind === 'death') {
    if (!p.enemy) return `${t} 処刑された${tail}`;
    const others = p.enemyCount - 1;
    return `${t} ${p.enemy}${others > 0 ? `他${others}人` : ''}に倒された${tail}`;
  }
  const helpers = p.allyCount - 1;
  return `${t} ${p.enemy}を倒した${helpers > 0 ? `（味方${helpers}人のアシスト）` : '（ソロキル）'}${tail}`;
}

const VIEW = 1000;
const R = 13;

function Marker({ p, x, y }: { p: DeathPoint; x: number; y: number }) {
  const color = bandOf(p.timeSec).color;
  const kill = p.kind === 'kill';
  // デスは塗り、キルは輪（色は線で出す）。外側に暗い縁を付けてマップのどこでも見えるようにする
  const fill = kill ? 'var(--dm-kill-fill)' : color;
  const stroke = kill ? color : 'var(--dm-outline)';
  const sw = kill ? 5 : 2.5;
  if (isSolo(p)) {
    return (
      <>
        {kill && <circle cx={x} cy={y} r={R + 2} fill="none" stroke="var(--dm-outline)" strokeWidth={2} />}
        <circle cx={x} cy={y} r={R} fill={fill} stroke={stroke} strokeWidth={sw} />
      </>
    );
  }
  const h = R * 1.25;
  const pts = `${x},${y - h} ${x + h},${y + h * 0.8} ${x - h},${y + h * 0.8}`;
  const outer = `${x},${y - h - 4} ${x + h + 3.5},${y + h * 0.8 + 2} ${x - h - 3.5},${y + h * 0.8 + 2}`;
  return (
    <>
      {kill && <polygon points={outer} fill="none" stroke="var(--dm-outline)" strokeWidth={2} strokeLinejoin="round" />}
      <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
    </>
  );
}

export function DeathMap({
  points,
  bounds,
  mapImage,
  normalize = true,
  labels = false,
  linkToMatch = true,
  maxWidth,
}: {
  points: DeathPoint[];
  bounds: Bounds;
  mapImage: string;
  /** レッド側の試合を自陣が左下になるよう揃える（map.ts の normalizePos） */
  normalize?: boolean;
  /** 点の横に時刻を出す（試合詳細のミニマップ用） */
  labels?: boolean;
  linkToMatch?: boolean;
  maxWidth?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [minX, minY] = bounds.min;
  const [maxX, maxY] = bounds.max;
  const toView = (p: DeathPoint) => {
    const { x, y } = normalizePos(p.x, p.y, normalize ? p.side : 'blue');
    // 画面は y が下向きなので反転
    return { vx: ((x - minX) / (maxX - minX)) * VIEW, vy: (1 - (y - minY) / (maxY - minY)) * VIEW };
  };
  const placed = points.map((p, i) => ({ p, i, ...toView(p) }));
  const h = hover === null ? null : placed[hover];

  return (
    <div className="deathmap" style={{ maxWidth }}>
      <img src={mapImage} alt="サモナーズリフト" draggable={false} />
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={`${points.length}件の地点`}>
        {/* デスの上にキルを重ねる */}
        {[...placed].sort((a, b) => (a.p.kind === b.p.kind ? 0 : a.p.kind === 'kill' ? 1 : -1)).map(({ p, i, vx, vy }) => (
          <g
            key={i}
            className={linkToMatch ? 'pt link' : 'pt'}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover((c) => (c === i ? null : c))}
            onClick={linkToMatch ? () => navigate(`/match/${p.matchId}`) : undefined}
          >
            <Marker p={p} x={vx} y={vy} />
            {labels && (
              <text x={vx + R + 6} y={vy + 6} className="dm-label">{mmss(p.timeSec)}</text>
            )}
          </g>
        ))}
        {h && <circle cx={h.vx} cy={h.vy} r={R + 9} fill="none" stroke="#fff" strokeWidth={3} pointerEvents="none" />}
      </svg>
      {h && (
        <div
          className="chart-tip dm-tip"
          style={{
            left: `${(h.vx / VIEW) * 100}%`,
            top: `${(h.vy / VIEW) * 100}%`,
            transform: `translate(${h.vx > VIEW * 0.6 ? 'calc(-100% - 14px)' : '14px'}, ${h.vy > VIEW * 0.75 ? 'calc(-100% - 6px)' : '-50%'})`,
          }}
        >
          <div style={{ fontWeight: 600 }}>{describePoint(h.p, linkToMatch)}</div>
          <div className="muted">
            {h.p.champion}（{h.p.role}）・{h.p.side === 'blue' ? 'ブルー' : 'レッド'}側・{h.p.zone}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeathMapLegend({ showKill }: { showKill: boolean }) {
  return (
    <div className="legend dm-legend">
      {TIME_BANDS.map((b) => (
        <span key={b.key}>
          <svg width="12" height="12" viewBox="0 0 12 12" style={{ verticalAlign: -1, marginRight: 4 }}>
            <circle cx="6" cy="6" r="5" fill={b.color} stroke="var(--dm-outline)" strokeWidth="1" />
          </svg>
          {b.label}
        </span>
      ))}
      <span>● 1対1 / ▲ 2人以上</span>
      {showKill && <span>塗り = デス / 輪 = キル</span>}
    </div>
  );
}
