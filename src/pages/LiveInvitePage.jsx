import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  APP_STORE,
  CoachAvatar,
  InvalidInvite,
  InviteFrame,
  firstNameOf,
  useDocumentTitle,
  useInviteInfo,
} from './InvitePage.jsx';
import './LiveInvitePage.css';

/**
 * /live/:code — a guest's seat at a coach's live class.
 *
 * The player is a plain <video>. Safari plays the Mux HLS manifest
 * natively; everywhere else hls.js drives MediaSource. hls.js is loaded
 * on demand, only once the class is actually live and has a playback id,
 * so the scheduled and ended states never download a player they cannot
 * use. Autoplay only works muted, so the stream starts silent with one
 * control on the frame to turn the sound on.
 *
 * The page re-asks invite-info every 30 s: a guest who arrives early sees
 * the class start without reloading, and one who stays sees it end.
 */

const POLL_MS = 30_000;
const MUX = (playbackId) => `https://stream.mux.com/${playbackId}.m3u8`;

function LivePlayer({ playbackId, coachFirst }) {
  const videoRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [trouble, setTrouble] = useState(null); // null | 'unsupported' | 'dropped'

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackId) return undefined;

    const src = MUX(playbackId);
    let hls = null;
    let cancelled = false;
    let retryTimer;
    let retries = 0;

    video.muted = true;
    video.defaultMuted = true;
    setTrouble(null);

    const tryPlay = () => video.play().catch(() => {});

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari, iOS: native HLS.
      video.src = src;
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
      video.addEventListener('error', () => setTrouble('dropped'));
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setTrouble('unsupported');
          return;
        }
        hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          // A live stream drops a segment now and then; give it three
          // honest retries before telling the guest anything.
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retries < 3) {
            retries += 1;
            setTrouble('dropped');
            retryTimer = setTimeout(() => {
              if (!cancelled && hls) hls.startLoad();
            }, 2000);
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && retries < 3) {
            retries += 1;
            hls.recoverMediaError();
            return;
          }
          setTrouble('dropped');
          hls.destroy();
          hls = null;
        });
        hls.on(Hls.Events.FRAG_BUFFERED, () => { retries = 0; setTrouble(null); });
        hls.loadSource(src);
        hls.attachMedia(video);
      }).catch(() => setTrouble('unsupported'));
    }

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      if (hls) hls.destroy();
      video.removeAttribute('src');
      video.load();
    };
  }, [playbackId]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
    if (!next) video.play().catch(() => {});
  };

  return (
    <div className="lv-frame lv-frame-live">
      <video
        ref={videoRef}
        className="lv-video"
        playsInline
        autoPlay
        muted
        aria-label={`Live class with ${coachFirst}`}
        onClick={toggleMute}
      />
      <span className="lv-badge" role="status">
        <span className="lv-badge-dot" aria-hidden="true" />
        Live
      </span>
      {trouble === 'unsupported' && (
        <div className="lv-idle">
          <p className="lv-idle-title">This browser can’t play the stream.</p>
          <p className="lv-idle-sub">Watch it in the app instead.</p>
        </div>
      )}
      {trouble === 'dropped' && (
        <p className="lv-note" role="status">Reconnecting to the stream.</p>
      )}
      {trouble !== 'unsupported' && (
        <button type="button" className="lv-unmute" onClick={toggleMute} aria-pressed={!muted}>
          {muted ? 'Tap to unmute' : 'Mute'}
        </button>
      )}
    </div>
  );
}

function IdleFrame({ title, sub }) {
  return (
    <div className="lv-frame" role="status">
      <div className="lv-idle">
        <p className="lv-idle-title">{title}</p>
        {sub ? <p className="lv-idle-sub">{sub}</p> : null}
      </div>
    </div>
  );
}

function LiveSkeleton() {
  return (
    <section className="lv-stack" aria-busy="true" aria-label="Loading class">
      <div className="inv-sk lv-sk-frame" />
      <div className="lv-meta">
        <div className="inv-sk lv-sk-avatar" />
        <div className="lv-meta-text">
          <div className="inv-sk inv-sk-line" style={{ width: 180, height: 16 }} />
          <div className="inv-sk inv-sk-line" style={{ width: 110 }} />
        </div>
      </div>
      <div className="inv-sk inv-sk-card" style={{ height: 120 }} />
      <div className="inv-sk inv-sk-btn" />
      <div className="inv-sk inv-sk-btn inv-sk-btn-ghost" />
    </section>
  );
}

export default function LiveInvitePage() {
  const params = useParams();
  const { code, status, info } = useInviteInfo(params.code, POLL_MS);
  const coach = info && info.coach;
  const live = info && info.live;
  const first = firstNameOf(coach && coach.name);

  useDocumentTitle(status === 'ready' ? `Live with ${first} · FitLink` : 'Live · FitLink');

  // A coach invite pasted into the class route: send it to the invite.
  if (status === 'ready' && info.kind !== 'live') {
    return <Navigate to={`/i/${code}`} replace />;
  }

  const ended = Boolean(info && (info.expired || (live && (live.status === 'ended' || live.status === 'cancelled'))));
  const playing = Boolean(!ended && live && live.status === 'live' && live.playback_id);
  const title = live && String(live.title || '').trim();

  let frame = null;
  if (status === 'ready') {
    if (playing) {
      frame = <LivePlayer playbackId={live.playback_id} coachFirst={first} />;
    } else if (ended) {
      frame = <IdleFrame title="Not live right now" sub="This class has ended. Replays live in the app." />;
    } else if (live && live.status === 'live') {
      frame = <IdleFrame title="Not live right now" sub="The stream is starting. Give it a moment." />;
    } else {
      frame = <IdleFrame title="Not live right now" sub={`${first} hasn’t started yet`} />;
    }
  }

  return (
    <InviteFrame code={code} path="live">
      {status === 'loading' && <LiveSkeleton />}

      {status === 'invalid' && <InvalidInvite />}

      {status === 'ready' && (
        <section className="lv-stack">
          {frame}

          <div className="lv-meta">
            <CoachAvatar coach={coach} size={48} />
            <div className="lv-meta-text">
              {title ? <p className="lv-class">{title}</p> : null}
              <p className="lv-with">Live with {first}</p>
            </div>
          </div>

          <section className="fl-card inv-card" aria-labelledby="lv-guest">
            <p id="lv-guest" className="fl-kicker inv-card-kicker">Watching as a guest</p>
            <p className="lv-card-body">
              You can watch the whole class here. In the app you can chat, follow {first},
              and get their classes before they start.
            </p>
          </section>

          <div className="inv-actions">
            <a className="fl-btn inv-btn inv-btn-primary" href={APP_STORE}>
              Get FitLink and follow {first}
            </a>
            <a className="fl-btn-ghost inv-btn inv-btn-secondary" href={`fitlink://invite/${code}`}>
              I have the app, watch there
            </a>
          </div>

          <p className="inv-foot">The link stops working when the class ends. Replays live in the app.</p>
        </section>
      )}
    </InviteFrame>
  );
}
