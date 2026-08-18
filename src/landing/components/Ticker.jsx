/**
 * Ticker — the gym-poster marquee.
 *
 * The strip of uppercase words scrolling between sections is lifted from
 * athletic brand language (Nike, Barry's, race bibs), and it earns its place
 * here structurally: our sections all share one visual rhythm, and a page
 * needs interruptions or it reads as a template. The ticker is the
 * interruption.
 *
 * Pure CSS animation. The word list is rendered twice so the loop point is
 * invisible — the second copy is aria-hidden because a screen reader should
 * hear the words once, not forever.
 */

export default function Ticker({ words, reverse = false }) {
  const row = (hidden) => (
    <div className="fl-ticker-row" aria-hidden={hidden || undefined}>
      {words.map((w) => (
        <span className="fl-ticker-word" key={`${hidden}-${w}`}>
          {w}
          <span className="fl-ticker-dot" aria-hidden="true">·</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className={`fl-ticker ${reverse ? 'fl-ticker-rev' : ''}`} role="presentation">
      <div className="fl-ticker-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
