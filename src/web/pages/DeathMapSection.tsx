import { useState } from 'react';
import type { getDeathMap } from '../../server/deathmap.ts';
import { ZONES } from '../../server/map.ts';
import { DeathMap, DeathMapLegend, TIME_BANDS, bandOf, isSolo } from '../DeathMap.tsx';
import { useApi } from '../lib.tsx';

type D = Awaited<ReturnType<typeof getDeathMap>>;

const LIMITS = [10, 20, 50, 0] as const;
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : '-');

/** 傾向ページの「デスマップ」 */
export function DeathMapSection() {
  const [champion, setChampion] = useState('');
  const [role, setRole] = useState('');
  const [limit, setLimit] = useState<number>(20);
  const [showKill, setShowKill] = useState(false);
  const [normalize, setNormalize] = useState(true);

  const qs = new URLSearchParams({ kind: showKill ? 'both' : 'death' });
  if (champion) qs.set('champion', champion);
  if (role) qs.set('role', role);
  if (limit) qs.set('limit', String(limit));
  const { data, error } = useApi<D>(`/api/deaths?${qs}`);

  const deaths = data?.points.filter((p) => p.kind === 'death') ?? [];
  const kills = data?.points.filter((p) => p.kind === 'kill') ?? [];
  const solo = deaths.filter(isSolo).length;
  const zones = ZONES.map((z) => ({ zone: z, n: deaths.filter((p) => p.zone === z).length })).filter((z) => z.n > 0).sort((a, b) => b.n - a.n);

  return (
    <>
      <h2>デスマップ</h2>
      <div className="filters">
        <select value={champion} onChange={(e) => setChampion(e.target.value)}>
          <option value="">チャンピオン: すべて</option>
          {data?.options?.champions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">ロール: すべて</option>
          {data?.options?.roles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {LIMITS.map((n) => <option key={n} value={n}>{n ? `直近 ${n} 試合` : '全試合'}</option>)}
        </select>
        <label><input type="checkbox" checked={showKill} onChange={(e) => setShowKill(e.target.checked)} />キルも表示</label>
        <label title="レッド側の試合を川の対角線で反転して、常に自陣を左下に揃える（レーンの位置は変わらない）"><input type="checkbox" checked={normalize} onChange={(e) => setNormalize(e.target.checked)} />自陣を左下に揃える</label>
      </div>
      {error ? (
        <div className="card empty">{error}</div>
      ) : !data ? (
        <div className="card empty">読み込み中…</div>
      ) : (
        <div className="card dm-layout">
          <div>
            <DeathMapLegend showKill={showKill} />
            <DeathMap points={data.points} bounds={data.bounds} mapImage={data.mapImage} normalize={normalize} />
          </div>
          <div className="dm-stats">
            <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
              <div>
                <h3>デス</h3>
                <div className="big">{deaths.length}</div>
                <div className="muted small">{data.matchCount}試合・平均 {data.matchCount ? Math.round((deaths.length / data.matchCount) * 10) / 10 : 0}</div>
              </div>
              <div>
                <h3>ソロデス率</h3>
                <div className="big">{pct(solo, deaths.length)}</div>
                <div className="muted small">1対1で倒された {solo}回</div>
              </div>
              {showKill && (
                <div>
                  <h3>キル</h3>
                  <div className="big">{kills.length}</div>
                  <div className="muted small">ソロキル {kills.filter(isSolo).length}回</div>
                </div>
              )}
            </div>
            <h3>時間帯別のデス</h3>
            <table>
              <tbody>
                {TIME_BANDS.map((b) => {
                  const n = deaths.filter((p) => bandOf(p.timeSec) === b).length;
                  return (
                    <tr key={b.key}>
                      <td><span className="sw" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: b.color, border: '1px solid var(--dm-outline)', marginRight: 6 }} />{b.label}</td>
                      <td className="num"><b>{n}</b></td>
                      <td className="num muted">{pct(n, deaths.length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <h3>エリア別のデス（自陣基準）</h3>
            {zones.length === 0 ? (
              <span className="muted">デスなし</span>
            ) : (
              <table>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z.zone}>
                      <td>{z.zone}</td>
                      <td className="num"><b>{z.n}</b></td>
                      <td className="num muted">{pct(z.n, deaths.length)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted small" style={{ margin: 0 }}>点にカーソルを合わせると詳細、クリックでその試合へ。エリアは座標からの簡易判定です。</p>
          </div>
        </div>
      )}
    </>
  );
}
