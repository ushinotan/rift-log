import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { getTrends } from '../../server/queries.ts';
import { ChartTooltip, fmtDec, fmtKda, fmtPct, navigate, useApi } from '../lib.tsx';
import { DeathMapSection } from './DeathMapSection.tsx';

type T = Awaited<ReturnType<typeof getTrends>>;
type Group = T['byChampion'][number];

export function Trends() {
  const { data, error } = useApi<T>('/api/trends');
  const [tab, setTab] = useState<'byChampion' | 'byRole' | 'byOpponent'>('byChampion');
  if (error) return <div className="empty">{error}</div>;
  if (!data) return <div className="empty">読み込み中…</div>;
  if (data.summary.games === 0) return <div className="card empty">まだ試合がありません — <code>npm run sync</code> で取り込めます</div>;

  return (
    <>
      <h2>勝率・KDA</h2>
      <div className="filters">
        {(
          [
            ['byChampion', 'チャンピオン別'],
            ['byRole', 'ロール別'],
            ['byOpponent', '対面別'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} aria-pressed={k === tab}>{l}</button>
        ))}
      </div>
      <GroupTable rows={data[tab]} nameLabel={tab === 'byChampion' ? 'チャンピオン' : tab === 'byRole' ? 'ロール' : '対面'} />

      <h2>推移</h2>
      <div className="grid3">
        <SeriesChart title="CS/分" data={data.series} dataKey="csPerMin" />
        <SeriesChart title="デス数" data={data.series} dataKey="deaths" />
        <SeriesChart title="キル関与（%）" data={data.series} dataKey="killParticipation" unit="%" />
      </div>

      <DeathMapSection />

      <div className="grid2" style={{ marginTop: 8 }}>
        <section>
          <h2>オブジェクト獲得率</h2>
          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>オブジェクト</th>
                  <th className="num">味方</th>
                  <th className="num">敵</th>
                  <th className="num">獲得率</th>
                  <th style={{ width: '35%' }}></th>
                </tr>
              </thead>
              <tbody>
                {data.objectives.map((o) => (
                  <tr key={o.label}>
                    <td>{o.label}</td>
                    <td className="num">{o.mine}{o.unit}</td>
                    <td className="num">{o.enemy}{o.unit}</td>
                    <td className="num"><b>{fmtPct(o.rate)}</b></td>
                    <td>
                      <div className="bar">
                        {o.rate !== null && <div className="a" style={{ width: `${o.rate}%` }} />}
                        {o.rate !== null && <div className="e" style={{ width: `${100 - o.rate}%` }} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small" style={{ marginBottom: 0 }}>
              ドラゴン・ヴォイドグラブ・ヘラルド・バロンは体数ベース（味方 ÷ 両チーム合計）、ファーストタワーは試合数ベース。
            </p>
          </div>
        </section>
        <section>
          <h2>よく出る改善点</h2>
          <div className="card">
            {data.frequentImprovements.length === 0 ? (
              <span className="muted">まだ振り返りがありません</span>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>改善点</th>
                    <th className="num">回数</th>
                    <th>試合</th>
                  </tr>
                </thead>
                <tbody>
                  {data.frequentImprovements.map((f) => (
                    <tr key={f.item}>
                      <td style={{ whiteSpace: 'normal' }}>{f.item}</td>
                      <td className="num"><b>{f.count}</b></td>
                      <td className="small">
                        {f.matchIds.map((id) => (
                          <a key={id} href={`#/match/${id}`} style={{ marginRight: 6 }}>{id.replace(/^JP1_/, '')}</a>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function GroupTable({ rows, nameLabel }: { rows: Group[]; nameLabel: string }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{nameLabel}</th>
            <th className="num">試合</th>
            <th className="num">勝敗</th>
            <th className="num">勝率</th>
            <th className="num">KDA</th>
            <th className="num">平均 K / D / A</th>
            <th className="num">CS/分</th>
            <th className="num">キル関与</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="num">{r.games}</td>
              <td className="num">{r.wins}勝{r.losses}敗</td>
              <td className="num"><b>{fmtPct(r.winRate)}</b></td>
              <td className="num">{fmtKda(r.kda)}</td>
              <td className="num">{fmtDec(r.avgKills)} / {fmtDec(r.avgDeaths)} / {fmtDec(r.avgAssists)}</td>
              <td className="num">{fmtDec(r.csPerMin)}</td>
              <td className="num">{fmtPct(r.killParticipation)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeriesChart({ title, data, dataKey, unit }: { title: string; data: T['series']; dataKey: 'csPerMin' | 'deaths' | 'killParticipation'; unit?: string }) {
  const avg = data.length ? Math.round((data.reduce((s, d) => s + d[dataKey], 0) / data.length) * 10) / 10 : 0;
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <b>{title}</b>
        <span className="muted small">平均 {unit === '%' ? fmtPct(avg) : fmtDec(avg)}</span>
      </div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -16 }} onClick={(s: any) => s?.activePayload?.[0] && navigate(`/match/${s.activePayload[0].payload.matchId}`)}>
            <CartesianGrid stroke="var(--line-soft)" vertical={false} />
            <XAxis dataKey="index" stroke="var(--line)" tickFormatter={(i) => data[i - 1]?.label ?? ''} minTickGap={16} />
            <YAxis stroke="var(--line)" allowDecimals={dataKey === 'csPerMin'} />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={unit === '%' ? fmtPct : dataKey === 'csPerMin' ? fmtDec : undefined}
                  labelFormatter={(_: unknown, payload: any[]) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${p.label} ${p.champion}（${p.win ? '勝利' : '敗北'}）` : '';
                  }}
                />
              }
            />
            <Line type="monotone" dataKey={dataKey} name={title} stroke="var(--primary)" strokeWidth={2} isAnimationActive={false} dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
