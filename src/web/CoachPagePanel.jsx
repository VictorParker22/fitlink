// /coach — "Your page": the coach's public page at /c/<handle> (launch plan Sprint 1 PR 3, 2026-10-25; fitlink-app
// migration 20261025130000). The coach picks or changes the name with set_handle (the server normalises, judges and
// answers `{ok: true, …}` or `{ok: false, code, error}`; the refusal's `error` is shown as sent), copies the link,
// opens the page, and reads the last 30 days of its funnel (my_page_stats). Nothing is suggested or saved for the
// coach: a handle is the coach's act. Taking the page down asks a second time.
import { useEffect, useState } from 'react';
import { myHandle, myPageStats, session, setHandle } from './api';
import { FUNNEL_NOTE, pageAddress, setHandleOutcome, statsView } from './coachPage';
import { handleFieldValue, handleHint, normalizeHandle } from './handles';
import { SITE_HOST, SITE_ORIGIN } from './site/brand';

export default function CoachPagePanel() {
  /** { state: 'loading' | 'ok' | 'error' | 'not_deployed', handle, message } */
  const [current, setCurrent] = useState({ state: 'loading', handle: null, message: null });
  const [attempt, setAttempt] = useState(0);
  const [field, setField] = useState('');
  const [busy, setBusy] = useState(false);
  /** The last save's answer in words: { kind: 'ok' | 'refused' | 'unknown', message }. */
  const [result, setResult] = useState(null);
  const [confirmDown, setConfirmDown] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await session();
        if (!s) throw Object.assign(new Error('Your sign-in has expired. Sign in again to continue.'), { code: 'unauthorized' });
        const h = await myHandle(s.user.id);
        if (!alive) return;
        setCurrent({ state: 'ok', handle: h, message: null });
        setField(h ?? '');
      } catch (err) {
        if (!alive) return;
        setCurrent({ state: err?.code === 'not_deployed' ? 'not_deployed' : 'error', handle: null, message: err?.message ?? null });
      }
    })();
    return () => { alive = false; };
  }, [attempt]);

  async function save(value) {
    setBusy(true);
    setResult(null);
    setCopied(null);
    try {
      const out = setHandleOutcome(await setHandle(value), SITE_HOST);
      if (out.ok === true) {
        setCurrent({ state: 'ok', handle: out.handle, message: null });
        setField(out.handle ?? '');
        setResult({ kind: 'ok', message: out.message });
      } else if (out.ok === false) {
        setResult({ kind: 'refused', message: out.message });
      } else {
        setResult({ kind: 'unknown', message: 'The answer couldn’t be read, so it isn’t clear whether your page’s name changed. Check again.' });
      }
    } catch (err) {
      setResult({
        kind: err?.outcomeUnknown ? 'unknown' : 'refused',
        message: err?.outcomeUnknown ? `${err.message} It isn’t clear whether your page’s name changed. Check again.` : err?.message,
      });
    } finally {
      setBusy(false);
      setConfirmDown(false);
    }
  }

  function submit(e) {
    e.preventDefault();
    const h = normalizeHandle(field);
    if (!h || handleHint(field)) return;
    save(h);
  }

  async function copy() {
    const url = `${SITE_ORIGIN}/c/${current.handle}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied('Link copied.');
    } catch {
      setCopied('Couldn’t copy here. Select the address above and copy it.');
    }
  }

  if (current.state === 'loading') {
    return <section className="fl-panel fl-page-panel" aria-labelledby="page-h" aria-busy="true"><h2 id="page-h">Your page</h2><p className="fl-note" aria-live="polite">Loading…</p></section>;
  }
  if (current.state === 'not_deployed') {
    return <section className="fl-panel fl-page-panel" aria-labelledby="page-h"><h2 id="page-h">Your page</h2><p className="fl-note">Coach pages aren’t available on the server yet.</p></section>;
  }
  if (current.state === 'error') {
    return (
      <section className="fl-panel fl-page-panel" aria-labelledby="page-h">
        <h2 id="page-h">Your page</h2>
        <div className="fl-error" role="alert">{current.message || 'We couldn’t load your page’s name right now.'}</div>
        <div className="fl-btnrow"><button type="button" className="fl-btn" onClick={() => { setCurrent({ state: 'loading', handle: null, message: null }); setAttempt((n) => n + 1); }}>Check again</button></div>
      </section>
    );
  }

  const h = current.handle;
  const typed = normalizeHandle(field);
  const hint = handleHint(field);
  const unchanged = typed === h;
  return (
    <section className="fl-panel fl-page-panel" aria-labelledby="page-h">
      <h2 id="page-h">Your page</h2>
      {h
        ? <p className="fl-copy">Athletes open it from your bio link, pick a pass and pay by card, no app needed.</p>
        : <p className="fl-copy">Pick a name for your page. Athletes open it from your bio link, pick a pass and pay by card, no app needed. Until you pick one, you have no page.</p>}
      {h && (
        <div className="fl-page-row">
          <span className="fl-page-addr">{pageAddress(SITE_HOST, h)}</span>
          <button type="button" className="fl-btn sm" onClick={copy}>Copy link</button>
          <a className="fl-btn sm" href={`/c/${h}`} target="_blank" rel="noopener noreferrer">Open page</a>
        </div>
      )}
      {copied && <p className="fl-note" role="status">{copied}</p>}

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label htmlFor="page-handle" className="fl-note">{h ? 'Change the name' : 'Your page’s name'}</label>
        <div className="fl-handle-field">
          <span aria-hidden="true">{SITE_HOST}/c/</span>
          <input id="page-handle" value={field} onChange={(e) => { setField(handleFieldValue(e.target.value)); setResult(null); }}
            autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} aria-describedby="page-handle-hint" disabled={busy} />
        </div>
        <p id="page-handle-hint" className="fl-note">
          {hint ?? (typed && !unchanged ? `Preview: ${pageAddress(SITE_HOST, typed)}` : '3 to 30 letters, digits or hyphens.')}
          {h && typed && !unchanged && !hint ? ' Your current link keeps working for a year and sends people to the new one.' : ''}
        </p>
        <div className="fl-btnrow">
          <button type="submit" className="fl-btn accent" disabled={busy || !typed || Boolean(hint) || unchanged}>{busy ? 'Saving…' : h ? 'Change name' : 'Create my page'}</button>
        </div>
      </form>
      {result && <div className={result.kind === 'ok' ? 'fl-notice ok' : 'fl-error'} role={result.kind === 'ok' ? 'status' : 'alert'}>
        {result.message}
        {result.kind === 'unknown' && <> <button type="button" className="fl-btn sm" onClick={() => { setResult(null); setCurrent({ state: 'loading', handle: null, message: null }); setAttempt((n) => n + 1); }}>Check again</button></>}
      </div>}

      {h && !confirmDown && (
        <p className="fl-note"><button type="button" className="fl-link" disabled={busy} onClick={() => setConfirmDown(true)}>Take my page down</button></p>
      )}
      {h && confirmDown && (
        <div className="fl-warn" role="alert">
          <p>{pageAddress(SITE_HOST, h)} stops opening for everyone, and nobody can join or buy from it. The name stays yours to take back for a year. Take it down?</p>
          <div className="fl-btnrow">
            <button type="button" className="fl-btn sm" disabled={busy} onClick={() => save(null)}>{busy ? 'Working…' : 'Take it down'}</button>
            <button type="button" className="fl-btn sm" disabled={busy} onClick={() => setConfirmDown(false)}>Keep it</button>
          </div>
        </div>
      )}

      {h && <PageStats />}
    </section>
  );
}

function PageStats() {
  const [stats, setStats] = useState({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    myPageStats(30)
      .then((answer) => {
        if (!alive) return;
        const v = statsView(answer);
        setStats(v ? { state: 'ok', view: v } : { state: 'error', message: 'The numbers came back in a shape this page can’t read.' });
      })
      .catch((err) => { if (alive) setStats({ state: 'error', message: err?.message }); });
    return () => { alive = false; };
  }, [attempt]);

  return (
    <div className="fl-page-stats" aria-labelledby="page-stats-h" role="group">
      <h3 id="page-stats-h" className="fl-copy" style={{ fontWeight: 700 }}>Last 30 days</h3>
      {stats.state === 'loading' && <p className="fl-note" aria-live="polite">Loading…</p>}
      {stats.state === 'error' && (
        <p className="fl-note" role="alert">{stats.message || 'We couldn’t load your page’s numbers.'} <button type="button" className="fl-link" onClick={() => { setStats({ state: 'loading' }); setAttempt((n) => n + 1); }}>Try again</button></p>
      )}
      {stats.state === 'ok' && (
        <>
          <dl className="fl-funnel">
            {stats.view.rows.map((r) => <div key={r.key}><dt>{r.label}</dt><dd>{r.count}</dd></div>)}
          </dl>
          <p className="fl-note">{FUNNEL_NOTE}</p>
        </>
      )}
    </div>
  );
}
