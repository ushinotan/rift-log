import type { MatchListRow, getFilterOptions, summarize } from '../../server/queries.ts';
import { ChampIcon, fmtDec, fmtKda, fmtPct, mmss, navigate, useApi } from '../lib.tsx';

type Resp = {
  rows: MatchListRow[];
  summary: ReturnType<typeof summarize>;
  options: Awaited<ReturnType<typeof getFilterOptions>>;
};

const RECENT = 20;
const THIS_YEAR = String(new Date().getFullYear());
const resultClass = (r: MatchListRow) => (r.remake ? 'remake' : r.win ? 'win' : 'loss');

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
  if (!data) return <ListSkeleton loading={loading} />;
  const s = data.summary;
  const filtered = params.toString() !== '';

  return (
    <>
      <section className="list-hero">
        <h1 className="page-title">試合一覧</h1>
        <p className="summary-line">
          <span><b>{s.games}</b>試合</span>
          <span><b>{s.wins}</b>勝<b>{s.losses}</b>敗（<b>{fmtPct(s.winRate)}</b>）</span>
          <span>KDA <b>{fmtKda(s.kda)}</b></span>
          <span>平均デス <b>{fmtDec(s.avgDeaths)}</b></span>
          <span>CS/分 <b>{fmtDec(s.csPerMin)}</b></span>
          <span>キル関与 <b>{fmtPct(s.killParticipation)}</b></span>
          {filtered && <span className="muted small">絞り込み後の集計</span>}
        </p>
        {data.rows.length > 0 && <RecentForm rows={data.rows} />}
      </section>

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
        <div className="card empty">
          {filtered ? '条件に合う試合がありません' : <>まだ試合がありません — <code>npm run sync</code> で取り込めます</>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="match-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>チャンピオン vs 対面</th>
                <th className="hide-sm">ロール</th>
                <th className="num">K / D / A</th>
                <th className="num hide-sm">KDA</th>
                <th className="num hide-sm">CS/分</th>
                <th className="num hide-md">キル関与</th>
                <th className="num hide-md">時間</th>
                <th><span className="hide-sm">振り返り</span><span className="show-sm-inline" aria-hidden>済</span></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.matchId} className={`clickable result-${resultClass(r)}`} onClick={() => navigate(`/match/${r.matchId}`)}>
                  <td className="date">
                    <span className="sr-only">{r.result} </span>
                    <span className="d">{r.startJst.slice(5, 10)}</span> <span className="tm">{r.startJst.slice(11)}</span>
                    {r.startJst.slice(0, 4) !== THIS_YEAR && <span className="y"> {r.startJst.slice(0, 4)}</span>}
                  </td>
                  <td>
                    <span className="versus">
                      <span className="champ"><ChampIcon k={r.championKey} name={r.champion} /><b>{r.champion}</b></span>
                      <span className="vs">vs</span>
                      {r.opponent ? (
                        <span className="champ">{r.opponentKey && <ChampIcon k={r.opponentKey} name={r.opponent} />}{r.opponent}</span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </span>
                    {r.remake && <span className="tag">リメイク</span>}
                  </td>
                  <td className="hide-sm">{r.roleLabel}</td>
                  <td className="num kda-cell">
                    {r.kills} / <span className={r.deaths >= 7 ? 'neg' : ''}>{r.deaths}</span> / {r.assists}
                    <span className="sub show-sm">{fmtKda(r.kda)}</span>
                  </td>
                  <td className="num hide-sm">{fmtKda(r.kda)}</td>
                  <td className="num hide-sm">{fmtDec(r.csPerMin)}</td>
                  <td className="num hide-md">{fmtPct(r.killParticipation)}</td>
                  <td className="num hide-md">{mmss(r.durationSec)}</td>
                  <td>
                    {r.reviewed ? (
                      <span className="muted" aria-label="振り返り済み">✓<span className="hide-sm"> 済</span></span>
                    ) : r.remake ? (
                      <span className="muted">-</span>
                    ) : (
                      <a className="todo" href={`#/match/${r.matchId}`} onClick={(e) => e.stopPropagation()}>振り返る</a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** 直近20試合の勝敗ストリップ（左が古く、右が最新） */
function RecentForm({ rows }: { rows: MatchListRow[] }) {
  const recent = rows.slice(0, RECENT).reverse();
  const played = recent.filter((r) => !r.remake);
  const wins = played.filter((r) => r.win).length;
  const cols = { gridTemplateColumns: `repeat(${recent.length}, minmax(0, 44px))` };
  const title = (r: MatchListRow) => `${r.startJst} ${r.result} ${r.champion} ${r.kills}/${r.deaths}/${r.assists} CS/分 ${fmtDec(r.csPerMin)}`;

  return (
    <div className="recent card">
      <div className="recent-head">
        <b>直近{recent.length}試合</b>
        <span>
          <b className="win-ink">{wins}勝</b> <b className="loss-ink">{played.length - wins}敗</b>
          <span className="muted">（{fmtPct(played.length ? (wins / played.length) * 100 : 0)}）</span>
        </span>
        <span className="muted small">左が古い → 右が最新</span>
      </div>
      <div className="strip" style={cols}>
        {recent.map((r) => (
          <a key={r.matchId} href={`#/match/${r.matchId}`} className={`cell ${resultClass(r)}`} title={title(r)} aria-label={title(r)}>
            <ChampIcon k={r.championKey} name={r.champion} />
          </a>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="skeleton" aria-busy="true" aria-label="読み込み中">
      <div className="sk sk-title" />
      <div className="sk sk-line" />
      <div className="sk sk-block" />
      <div className="sk sk-table" />
    </div>
  );
}
