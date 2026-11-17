import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { MatchList } from './pages/MatchList.tsx';
import { MatchDetail } from './pages/MatchDetail.tsx';
import { Trends } from './pages/Trends.tsx';

function useHash() {
  const [hash, setHash] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => {
    const f = () => {
      setHash(window.location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return hash;
}

function App() {
  const hash = useHash();
  const [path, query = ''] = hash.split('?');
  const matchId = path.match(/^\/match\/(.+)$/)?.[1];
  const page = matchId ? 'detail' : path === '/trends' ? 'trends' : 'list';
  return (
    <>
      <header className="top">
        <h1><span className="mark">◆</span>Rift Log</h1>
        <nav>
          <a href="#/" className={page !== 'trends' ? 'active' : ''}>試合一覧</a>
          <a href="#/trends" className={page === 'trends' ? 'active' : ''}>傾向</a>
        </nav>
        <span className="who">牛乃タン#SION ・ ランク ソロ/デュオ</span>
      </header>
      <main>
        {page === 'detail' && <MatchDetail matchId={decodeURIComponent(matchId!)} />}
        {page === 'trends' && <Trends />}
        {page === 'list' && <MatchList query={query} />}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
