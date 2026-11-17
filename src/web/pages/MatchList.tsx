import type { MatchListRow, getFilterOptions, summarize } from '../../server/queries.ts';
import { ChampIcon, ResultBadge, fmtDec, fmtKda, fmtPct, mmss, navigate, useApi } from '../lib.tsx';

type Resp = {
  rows: MatchListRow[];
  summary: ReturnType<typeof summarize>;
  options: Awaited<ReturnType<typeof getFilterOptions>>;
};

export function MatchList({ query }: { query: string }) {
  const params = new URLSearchParams(query);
  const { data, error, loading } = useApi<Resp>(`/api/matches?${params}`);
  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(query);
    if (value) p.set(key, value);
    else p.delete(key);
    navigate(`/?${p}`);
  };

  if (error) return <div className="empty">読み込みに失敗しました: {error}</div>;
  if (!data) return <div className="empty">{loading ? '読み込み中…' : ''}</div>;
  const s = data.summary;
  const filtered = params.toString() !== '';

  return (
    <>
      <div className="tiles">
        <Tile label="試合数" value={String(s.games)} sub={`${s.wins}勝 ${s.losses}敗`} />
        <Tile label="勝率" value={fmtPct(s.winRate)} />
        <Tile label="KDA" value={fmtKda(s.kda)} sub={`${fmtDec(s.avgKills)} / ${fmtDec(s.avgDeaths)} / ${fmtDec(s.avgAssists)}`} />
        <Tile label="平均デス" value={fmtDec(s.avgDeaths)} />
        <Tile label="CS/分" value={fmtDec(s.csPerMin)} />
        <Tile label="キル関与" value={fmtPct(s.killParticipation)} />
      </div>
      {filtered && <p className="muted small" style={{ marginTop: -8 }}>※ 上の集計は絞り込み後の試合が対象です</p>}

      <div className="filters">
        <select value={params.get('result') ?? ''} onChange={(e) => setFilter('result', e.target.value)} aria-label="結果">
          <option value="">結果: すべて</option>
          <option value="勝利">勝利</option>
          <option value="敗北">敗北</option>
          <option value="リメイク">リメイク</option>
        </select>
        <select value={params.get('champion') ?? ''} onChange={(e) => setFilter('champion', e.target.value)} aria-label="チャンピオン">
          <option value="">チャンピオン: すべて</option>
          {data.options.champions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={params.get('role') ?? ''} onChange={(e) => setFilter('role', e.target.value)} aria-label="ロール">
          <option value="">ロール: すべて</option>
          {data.options.roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {filtered && <button onClick={() => navigate('/')}>絞り込みを解除</button>}
      </div>

      {data.rows.length === 0 ? (
        <div className="card empty">まだ試合がありません — <code>npm run sync</code> で取り込めます</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日時</th>
                <th>結果</th>
                <th>チャンピオン</th>
                <th>ロール</th>
                <th>対面</th>
                <th className="num">K / D / A</th>
                <th className="num">KDA</th>
                <th className="num">CS/分</th>
                <th className="num">キル関与</th>
                <th className="num">時間</th>
                <th>振り返り</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.matchId} className="clickable" onClick={() => navigate(`/match/${r.matchId}`)}>
                  <td>{r.startJst}</td>
                  <td><ResultBadge result={r.result} /></td>
                  <td><span className="champ"><ChampIcon k={r.championKey} name={r.champion} />{r.champion}</span></td>
                  <td>{r.roleLabel}</td>
                  <td>{r.opponent ?? '-'}</td>
                  <td className="num">{r.kills} / {r.deaths} / {r.assists}</td>
                  <td className="num">{fmtKda(r.kda)}</td>
                  <td className="num">{fmtDec(r.csPerMin)}</td>
                  <td className="num">{fmtPct(r.killParticipation)}</td>
                  <td className="num">{mmss(r.durationSec)}</td>
                  <td>{r.reviewed ? '✓ 済' : <span className="muted">未</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
