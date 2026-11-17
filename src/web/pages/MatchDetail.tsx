import { useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { getMatchDetail } from '../../server/queries.ts';
import { ChampIcon, ChartTooltip, ItemIcon, ResultBadge, fmt, useApi } from '../lib.tsx';

type Detail = NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>;
type P = Detail['me'];
type Named = { id: number; name: string };
type Runes = { primaryStyle: Named | null; subStyle: Named | null; keystone: Named | null; primary: Named[]; secondary: Named[] };

export function MatchDetail({ matchId }: { matchId: string }) {
  const { data, error } = useApi<Detail>(`/api/matches/${encodeURIComponent(matchId)}`);
  if (error) return <div className="empty">{error}</div>;
  if (!data) return <div className="empty">読み込み中…</div>;
  const { match: m, me, opponent: opp } = data;
  const runes = me.runes as Runes;
  const spells = me.summonerSpells as { name: string }[];
  const myTeam = data.teams.find((t) => t.isMyTeam)!;
  const enemyTeam = data.teams.find((t) => !t.isMyTeam)!;

  return (
    <>
      <p className="small"><a href="#/">← 試合一覧</a></p>

      <section className="card">
        <div className="overview">
          <ChampIcon k={me.championKey} name={me.champion} size="lg" />
          <div>
            <div className="big">
              <ResultBadge result={m.result} /> {me.champion}（{m.roleLabel}） vs {m.opponentChampion ?? '-'}
            </div>
            <div className="muted">{m.startJst} ・ {m.duration} ・ パッチ {m.patch} ・ {m.matchId}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="big">{me.kills} / {me.deaths} / {me.assists}</div>
            <div className="muted">
              KDA {((me.kills + me.assists) / Math.max(1, me.deaths)).toFixed(2)} ・ キル関与 {Math.round(me.killParticipation * 100)}% ・ CS {me.cs}（{(me.cs / (m.durationSec / 60)).toFixed(1)}/分）
            </div>
          </div>
        </div>
        <dl className="kv" style={{ marginTop: 14 }}>
          <dt>ルーン</dt>
          <dd>
            <b>{runes.primaryStyle?.name}</b>：{runes.primary.map((r) => r.name).join(' / ')}
            <br />
            <b>{runes.subStyle?.name}</b>：{runes.secondary.map((r) => r.name).join(' / ')}
          </dd>
          <dt>サモナースペル</dt>
          <dd>{spells.map((s) => s.name).join(' / ')}</dd>
          <dt>スキル順</dt>
          <dd><SkillOrder skills={data.skills} /></dd>
        </dl>
      </section>

      <div className="grid2" style={{ marginTop: 16 }}>
        <section>
          <h2>対面との比較</h2>
          {opp ? <Compare me={me} opp={opp} /> : <div className="card muted">対面が特定できませんでした</div>}
        </section>
        <section>
          <h2>ゴールド差の推移</h2>
          <GoldChart data={data.goldGraph} />
        </section>
      </div>

      <h2>オブジェクト</h2>
      <ObjectiveBars mine={myTeam} enemy={enemyTeam} />

      <h2>全員のスタッツ</h2>
      <Scoreboard rows={data.participants} myTeamId={m.myTeamId} durationSec={m.durationSec} />

      <div className="grid2" style={{ marginTop: 8 }}>
        <section>
          <h2>タイムライン</h2>
          <Timeline events={data.events} />
        </section>
        <section>
          <h2>ビルド（購入順）</h2>
          <Build items={data.items} finalItems={me.items as { id: number; name: string }[]} version={m.ddragonVersion} />
          <h2>振り返り</h2>
          <Review groups={data.reviews} />
        </section>
      </div>
    </>
  );
}

function SkillOrder({ skills }: { skills: Detail['skills'] }) {
  if (!skills.length) return <span className="muted">データなし</span>;
  const slots = ['Q', 'W', 'E', 'R'] as const;
  const names = Object.fromEntries(skills.map((s) => [s.slot, s.skill]));
  return (
    <div>
      <div style={{ marginBottom: 6 }}>{skills.map((s) => s.slot).join(' → ')}</div>
      <div className="skillgrid" role="table" aria-label="スキル順">
        {slots.map((slot) => (
          <div key={slot} style={{ display: 'contents' }}>
            <div title={names[slot]} style={{ fontWeight: 600 }}>{slot}</div>
            {Array.from({ length: 18 }, (_, i) => {
              const s = skills.find((x) => x.level === i + 1);
              const on = s?.slot === slot;
              return <div key={i} className={on ? 'on' : 'off'} title={on ? `${i + 1}: ${s!.skill}` : ''}>{on ? i + 1 : ''}</div>;
            })}
          </div>
        ))}
      </div>
      <div className="muted small" style={{ marginTop: 4 }}>
        {slots.map((s) => names[s] && `${s}: ${names[s]}`).filter(Boolean).join(' ・ ')}
      </div>
    </div>
  );
}

function Compare({ me, opp }: { me: P; opp: P }) {
  const rows: { label: string; a: number; b: number; lowerIsBetter?: boolean; neutral?: boolean }[] = [
    { label: 'キル', a: me.kills, b: opp.kills },
    { label: 'デス', a: me.deaths, b: opp.deaths, lowerIsBetter: true },
    { label: 'アシスト', a: me.assists, b: opp.assists },
    { label: 'CS', a: me.cs, b: opp.cs },
    { label: 'ゴールド', a: me.gold, b: opp.gold },
    { label: '与ダメージ', a: me.damageDealt, b: opp.damageDealt },
    { label: '被ダメージ', a: me.damageTaken, b: opp.damageTaken, neutral: true },
    { label: '設置ワード', a: me.wardsPlaced, b: opp.wardsPlaced },
    { label: '破壊ワード', a: me.wardsKilled, b: opp.wardsKilled },
    { label: 'コントロールワード購入', a: me.controlWardsBought, b: opp.controlWardsBought },
    { label: '視界スコア', a: me.visionScore, b: opp.visionScore },
  ];
  return (
    <div className="table-wrap">
      <table className="cmp">
        <thead>
          <tr>
            <th></th>
            <th className="num"><span className="champ">{me.champion}（自分）</span></th>
            <th className="num">{opp.champion}</th>
            <th className="num">差</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.a - r.b;
            const good = r.neutral || d === 0 ? '' : (d > 0) !== !!r.lowerIsBetter ? 'better' : 'worse';
            return (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num">{fmt(r.a)}</td>
                <td className="num">{fmt(r.b)}</td>
                <td className={`num ${good}`}>{d > 0 ? '+' : ''}{fmt(d)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GoldChart({ data }: { data: Detail['goldGraph'] }) {
  if (!data.length) return <div className="card muted">タイムラインなし</div>;
  return (
    <div className="card" style={{ height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" vertical={false} />
          <XAxis dataKey="minute" tickFormatter={(v) => `${v}分`} stroke="var(--grid)" />
          <YAxis stroke="var(--grid)" width={56} tickFormatter={(v) => fmt(v)} />
          <ReferenceLine y={0} stroke="var(--text-3)" />
          <Tooltip content={<ChartTooltip labelFormatter={(l: number) => `${l}分`} unit="G" />} />
          <Legend />
          <Line type="monotone" dataKey="laneGoldDiff" name="対面とのゴールド差" stroke="var(--ally)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="teamGoldDiff" name="チームのゴールド差" stroke="#eb6834" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ObjectiveBars({ mine, enemy }: { mine: Detail['teams'][number]; enemy: Detail['teams'][number] }) {
  const rows = [
    ['キル', 'kills'],
    ['タワー', 'towers'],
    ['ドラゴン', 'dragons'],
    ['ヴォイドグラブ', 'voidGrubs'],
    ['ヘラルド', 'heralds'],
    ['バロン', 'barons'],
    ['アタカン', 'atakhans'],
    ['インヒビター', 'inhibitors'],
  ] as const;
  const first = (label: string, a: boolean, b: boolean) => `${label}: ${a ? '味方' : b ? '敵' : 'なし'}`;
  return (
    <div className="card">
      <div className="legend">
        <span><span className="sw" style={{ background: 'var(--ally)' }} />味方</span>
        <span><span className="sw" style={{ background: 'var(--enemy)' }} />敵</span>
        <span>{first('ファーストブラッド', mine.firstBlood, enemy.firstBlood)}</span>
        <span>{first('ファーストタワー', mine.firstTower, enemy.firstTower)}</span>
        <span>{first('ファーストドラゴン', mine.firstDragon, enemy.firstDragon)}</span>
      </div>
      <div className="grid3" style={{ gap: '10px 24px' }}>
        {rows.map(([label, k]) => {
          const a = mine[k];
          const b = enemy[k];
          const total = a + b;
          return (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }} className="small">
                <b>{a}</b>
                <span>{label}</span>
                <b>{b}</b>
              </div>
              <div className="bar" title={`${label} 味方 ${a} / 敵 ${b}`}>
                {total > 0 && <div className="a" style={{ width: `${(a / total) * 100}%` }} />}
                {total > 0 && <div className="e" style={{ width: `${(b / total) * 100}%` }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Scoreboard({ rows, myTeamId, durationSec }: { rows: Detail['participants']; myTeamId: number; durationSec: number }) {
  const teams = [myTeamId, 300 - myTeamId];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>陣営</th>
            <th>ロール</th>
            <th>チャンピオン</th>
            <th>プレイヤー</th>
            <th className="num">K / D / A</th>
            <th className="num">キル関与</th>
            <th className="num">与ダメ</th>
            <th className="num">被ダメ</th>
            <th className="num">ゴールド</th>
            <th className="num">CS</th>
            <th className="num">Lv</th>
            <th className="num">設置W</th>
            <th className="num">破壊W</th>
            <th className="num">CW購入</th>
            <th>最終アイテム</th>
          </tr>
        </thead>
        <tbody>
          {teams.flatMap((t) =>
            rows
              .filter((p) => p.teamId === t)
              .map((p) => (
                <tr key={p.participantId} className={p.isMe ? 'me' : ''}>
                  <td style={{ borderLeft: `4px solid var(${t === myTeamId ? '--ally' : '--enemy'})` }}>{t === myTeamId ? '味方' : '敵'}</td>
                  <td>{p.roleLabel}</td>
                  <td><span className="champ"><ChampIcon k={p.championKey} name={p.champion} />{p.champion}</span></td>
                  <td className="small">{p.playerName}{p.isMe ? '（自分）' : ''}</td>
                  <td className="num">{p.kills} / {p.deaths} / {p.assists}</td>
                  <td className="num">{Math.round(p.killParticipation * 100)}%</td>
                  <td className="num">{fmt(p.damageDealt)}</td>
                  <td className="num">{fmt(p.damageTaken)}</td>
                  <td className="num">{fmt(p.gold)}</td>
                  <td className="num" title={`${(p.cs / (durationSec / 60)).toFixed(1)}/分`}>{p.cs}</td>
                  <td className="num">{p.level}</td>
                  <td className="num">{p.wardsPlaced}</td>
                  <td className="num">{p.wardsKilled}</td>
                  <td className="num">{p.controlWardsBought}</td>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 2 }}>
                      {(p.items as { slot: number; id: number; name: string }[]).map((i) => (
                        <ItemIcon key={i.slot ?? i.id} id={i.id} name={i.name} />
                      ))}
                    </span>
                  </td>
                </tr>
              )),
          )}
        </tbody>
      </table>
    </div>
  );
}

const EVENT_FILTERS = ['すべて', '自分が関与', 'キル', 'オブジェクト', 'タワー'] as const;

function Timeline({ events }: { events: Detail['events'] }) {
  const [f, setF] = useState<(typeof EVENT_FILTERS)[number]>('すべて');
  const shown = events.filter((e) =>
    f === 'すべて' ? true
    : f === '自分が関与' ? e.involvesMe
    : f === 'キル' ? e.type === 'キル'
    : f === 'タワー' ? e.type === 'タワー' || e.type === 'インヒビター'
    : !['キル', 'タワー', 'インヒビター'].includes(e.type),
  );
  if (!events.length) return <div className="card muted">タイムラインなし</div>;
  return (
    <div className="card">
      <div className="filters">
        {EVENT_FILTERS.map((x) => (
          <button key={x} onClick={() => setF(x)} style={x === f ? { background: 'var(--surface-2)', fontWeight: 600 } : undefined}>{x}</button>
        ))}
      </div>
      <div className="legend">
        <span><span className="sw" style={{ background: 'var(--ally)' }} />味方が取った</span>
        <span><span className="sw" style={{ background: 'var(--enemy)' }} />敵が取った</span>
        <span><span className="mark">★キル</span> 自分の関与</span>
      </div>
      <ul className="timeline">
        {shown.map((e) => (
          <li key={e.id} className={e.isAlly ? 'ally' : 'enemy'}>
            <span className="t">{e.time}</span>
            <span className="type">{e.type}</span>
            <span className="small">
              {e.type === 'キル' ? (
                <>
                  {e.killer ?? '処刑'} → {e.victim}
                  {(e.assists as string[] | null)?.length ? <span className="muted">（アシスト: {(e.assists as string[]).join('、')}）</span> : null}
                  {e.detail && <b> {e.detail}</b>}
                </>
              ) : (
                <>
                  {e.detail ?? ''}
                  {e.killer && <span className="muted">（{e.killer}）</span>}
                </>
              )}
            </span>
            <span>{e.myInvolvement && <span className="mark">★{e.myInvolvement}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Build({ items, finalItems, version }: { items: Detail['items']; finalItems: { id: number; name: string }[]; version: string }) {
  if (!items.length) return <div className="card muted">データなし</div>;
  return (
    <div className="card">
      <div className="build">
        {items.map((i) => (
          <div key={i.id} className={`step ${i.action === '売却' ? 'sold' : i.action === '取り消し' ? 'undo' : ''}`} title={`${i.time} ${i.action} ${i.item}`}>
            <span className="muted">{i.time}</span>
            <ItemIcon id={i.itemId} name={i.item} version={version} />
            <span className="name">{i.item}</span>
            {i.action !== '購入' && <span className="muted">（{i.action}）</span>}
          </div>
        ))}
      </div>
      <div className="small" style={{ marginTop: 10 }}>
        <span className="muted">最終アイテム：</span>{finalItems.map((i) => i.name).join(' / ')}
      </div>
    </div>
  );
}

function Review({ groups }: { groups: Detail['reviews'] }) {
  if (!groups.length) {
    return <div className="card muted">まだ振り返りがありません。Claude Code で「ランク戦を振り返って」と頼むと作成されます。</div>;
  }
  return (
    <div className="card review">
      {groups.map((g) => (
        <div key={g.category}>
          <h3>{g.category}</h3>
          <ul>
            {g.items.map((r, i) => (
              <li key={i}>
                <span className="item">{r.item}</span>
                {r.detail && <div className="small">{r.detail}</div>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
