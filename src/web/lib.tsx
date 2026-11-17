import { useEffect, useState } from 'react';

export function useApi<T>(url: string | null): { data: T | null; error: string | null; loading: boolean } {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fetch(url)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? r.statusText);
        return body as T;
      })
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: String(e.message ?? e), loading: false }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state;
}

let ddVersion: string | null = null;
const listeners = new Set<() => void>();
fetch('/api/ddragon')
  .then((r) => r.json())
  .then((b) => {
    ddVersion = b.version;
    listeners.forEach((f) => f());
  })
  .catch(() => {});

export function useDdragonVersion() {
  const [v, setV] = useState(ddVersion);
  useEffect(() => {
    const f = () => setV(ddVersion);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  return v;
}

const hide = (e: React.SyntheticEvent<HTMLImageElement>) => (e.currentTarget.style.visibility = 'hidden');

export function ChampIcon({ k, name, size }: { k: string; name: string; size?: 'lg' }) {
  const v = useDdragonVersion();
  if (!v) return <span className={`icon ${size ?? ''}`} />;
  return (
    <img className={`icon ${size ?? ''}`} src={`https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${k}.png`} alt={name} title={name} onError={hide} loading="lazy" />
  );
}

export function ItemIcon({ id, name, version }: { id: number; name: string; version?: string }) {
  const latest = useDdragonVersion();
  const v = version ?? latest;
  if (!v) return <span className="icon item" />;
  return <img className="icon item" src={`https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${id}.png`} alt={name} title={name} onError={hide} loading="lazy" />;
}

export function ResultBadge({ result }: { result: string }) {
  const cls = result === '勝利' ? 'win' : result === '敗北' ? 'loss' : 'remake';
  return <span className={`badge ${cls}`}>{result}</span>;
}

const nf = (digits: number) => new Intl.NumberFormat('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const nf0 = nf(0);
const nf1 = nf(1);
const nf2 = nf(2);
const MINUS = '−';

/** 整数（3桁区切り）。CS・ダメージ・回数など */
export const fmt = (n: number) => nf0.format(n);
/** ゴールド（3桁区切りの整数） */
export const fmtGold = (n: number) => nf0.format(n);
/** 小数1桁固定。CS/分・平均デスなど */
export const fmtDec = (n: number) => nf1.format(n);
/** KDA（小数2桁固定）: 16 → "16.00" */
export const fmtKda = (n: number) => nf2.format(n);
/** 割合（0〜100 の値を小数1桁固定の %）: 25 → "25.0%"。null は "-" */
export const fmtPct = (pct: number | null | undefined) => (pct === null || pct === undefined || Number.isNaN(pct) ? '-' : `${nf1.format(pct)}%`);
/** 0〜1 の比率を割合に: 0.488 → "48.8%" */
export const fmtRatio = (r: number) => fmtPct(r * 100);
/** 差分（符号付き・3桁区切り）: 2857 → "+2,857" / -65 → "−65" / 0 → "±0" */
export const fmtDiff = (n: number, digits = 0) => {
  const f = nf(digits).format(Math.abs(n));
  return n > 0 ? `+${f}` : n < 0 ? `${MINUS}${f}` : `±${f}`;
};
/** 差分の色クラス（上回り = pos / 下回り = neg）。lowerIsBetter で向きを反転 */
export const diffClass = (n: number, lowerIsBetter = false) => (n === 0 ? '' : (n > 0) !== lowerIsBetter ? 'pos' : 'neg');
export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec) % 60).padStart(2, '0')}`;

export function navigate(path: string) {
  window.location.hash = path;
}

export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <div style={{ fontWeight: 600 }}>{labelFormatter ? labelFormatter(label, payload) : label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey}>
          <span className="sw" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: p.color, marginRight: 6 }} />
          {p.name}: <b>{p.value === null ? '-' : valueFormatter ? valueFormatter(p.value) : p.value}</b>
          {unit ?? ''}
        </div>
      ))}
    </div>
  );
}
