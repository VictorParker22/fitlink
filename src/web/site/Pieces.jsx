// The design's shared pieces (common.py phone(), final_cta() and PLANS_SHORT; the steps band, the
// kicker, the Archivo display line, the arrow link and the reveal wrapper every page composes).
// The markup and the words are the design's; every number is pricing.js's (the server's config);
// the name, host and store address are brand.js's. Pages import from here and never redraw one.
import { Link } from 'react-router-dom';
import { APP_STORE_URL, BRAND_NAME, SITE_HOST } from './brand';
import {
  ELITE_FEE_PERCENT, ELITE_MONTHLY_USD, ELITE_YEARLY_USD, FOUNDING_FEE_PERCENT, FOUNDING_SLOTS, FREE_ROSTER_CAP,
  STANDARD_FEE_PERCENT, foundingFreeWords, usd,
} from './pricing';
import { FOUNDING_CLOSES_LABEL } from './planLines';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * A screen from public/screens in the CSS phone frame (`.phone`, sized by `--w` on the parent's
 * rule). `eager` marks the hero's screens (fetchpriority high instead of lazy loading).
 */
export function Phone({ name, alt, className, eager = false, style }) {
  return (
    <div className={cx('phone', className)} style={style}>
      <img
        src={`/screens/${name}.webp`}
        width="780"
        height="1688"
        alt={alt}
        decoding="async"
        {...(eager ? { fetchPriority: 'high' } : { loading: 'lazy' })}
      />
    </div>
  );
}

/** The violet closing band with the one lime button. Defaults are the design's. */
export function FinalCta({
  title = 'Your next athlete is one link away.',
  note = `On a computer? Open ${SITE_HOST} on your iPhone and tap Get the app.`,
  art = 'coach-live',
  alt = 'A coach’s page is live, with a link to share',
}) {
  return (
    <section className="final on-violet pad">
      <div className="wrap">
        <div className="final-copy">
          <h2 className="display d-xl">{title}</h2>
          <a className="btn btn-lime" href={APP_STORE_URL}>Get {BRAND_NAME} for iPhone</a>
          <p className="small" style={{ color: '#F1ECFF' }}>{note}</p>
        </div>
        <div className="final-art" aria-hidden="true"><Phone name={art} alt={alt} /></div>
      </div>
    </section>
  );
}

/** The three plan cards (Free / Coach Elite / Founding). The caller wraps them in a `.reveal` as the design does. */
export function PlansShort() {
  const freeWords = foundingFreeWords();
  // "for the first year", or "for the first 6 months" should the offer change.
  const firstPeriod = freeWords === 'a year' ? 'year' : freeWords;
  const eliteBadge = ELITE_FEE_PERCENT * 2 === STANDARD_FEE_PERCENT ? 'Half the fee' : `${ELITE_FEE_PERCENT}% fee`;
  return (
    <div className="plans">
      <article className="plan">
        <div className="plan-name">Free</div>
        <div className="price"><span className="num">{usd(0)}</span><span>a month</span></div>
        <div className="fee"><b>{STANDARD_FEE_PERCENT}%</b> per pass sold</div>
        <ul>
          <li>Your page, passes and checkout</li>
          <li>Programs, check-ins and messages</li>
          <li>Up to {FREE_ROSTER_CAP} paying athletes</li>
        </ul>
        <a className="btn btn-ghost" href={APP_STORE_URL}>Start free in the app</a>
      </article>
      <article className="plan featured">
        <div className="plan-name">Coach Elite <span className="badge">{eliteBadge}</span></div>
        <div className="price">
          <span className="num">{usd(ELITE_MONTHLY_USD)}</span>
          <span>a month, or {usd(ELITE_YEARLY_USD)} a year</span>
        </div>
        <div className="fee"><b>{ELITE_FEE_PERCENT}%</b> per pass sold</div>
        <ul>
          <li>Everything in Free</li>
          <li>No athlete cap</li>
          <li>Your assistant drafts replies, you approve</li>
        </ul>
        <Link className="btn btn-lime" to="/coach">Subscribe on the web</Link>
      </article>
      <article className="plan">
        <div className="plan-name">Founding <span className="badge">{FOUNDING_SLOTS} spots</span></div>
        <div className="price"><span className="num">{usd(0)}</span><span>for the first {firstPeriod}</span></div>
        <div className="fee"><b>{FOUNDING_FEE_PERCENT}%</b> per pass sold</div>
        <ul>
          <li>Coach Elite free for {freeWords}</li>
          <li>The “Founding {FOUNDING_SLOTS}” badge on your page</li>
          <li>Applications close {FOUNDING_CLOSES_LABEL}</li>
        </ul>
        <Link className="btn btn-ghost" to="/founding">Apply for a spot</Link>
      </article>
    </div>
  );
}

/**
 * The numbered steps band: `items` = [{ n: '01', title, body }]. The caller puts it in a
 * `<section class="on-deep pad">`. The list reset is inline as in the design (the generated CSS
 * has no rule for it) and the `ol` carries the design's own `reveal`.
 */
export function Steps({ items, className }) {
  return (
    <ol className={cx('steps', 'reveal', className)} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((step) => (
        <li className="step" key={step.n}>
          <span className="num" aria-hidden="true">{step.n}</span>
          <h3>{step.title}</h3>
          <p>{step.body}</p>
        </li>
      ))}
    </ol>
  );
}

/** The small violet-square label above a heading. */
export function Kicker({ className, children, ...rest }) {
  return <span className={cx('kicker', className)} {...rest}>{children}</span>;
}

/** The Archivo headline: `<Display as="h1" size="xl">` → `<h1 class="display d-xl">`. Sizes: xxl xl l m s. */
export function Display({ as: Tag = 'h2', size = 'l', className, children, ...rest }) {
  return <Tag className={cx('display', `d-${size}`, className)} {...rest}>{children}</Tag>;
}

/** A text link with the arrow: `to` for a route, `href` for an anchor on the page or an outside address. */
export function LinkArrow({ to, href, className, children, ...rest }) {
  const cls = cx('link-arrow', className);
  if (to) return <Link className={cls} to={to} {...rest}>{children}</Link>;
  return <a className={cls} href={href} {...rest}>{children}</a>;
}

/** Adds the design's `reveal` class (the shell's useReveal() adds `in` when it scrolls into view). */
export function Reveal({ as: Tag = 'div', className, children, ...rest }) {
  return <Tag className={cx(className, 'reveal')} {...rest}>{children}</Tag>;
}
