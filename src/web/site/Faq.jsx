// The design's question list (common.py faq()): one <details> per item, the answer inside
// `.answer`. `items` = [{ q, a, id? }]; `a` is a string (one paragraph), an array (one paragraph
// per string; a JSX entry is rendered as it is) or JSX (rendered as it is). An older caller's
// `labelledBy` prop is accepted and ignored: the list is a plain list, named by the heading
// before it, and a generic div may not carry aria-labelledby.
import { Fragment } from 'react';

function Answer({ a }) {
  if (Array.isArray(a)) {
    return a.map((part, i) => (typeof part === 'string' ? <p key={i}>{part}</p> : <Fragment key={i}>{part}</Fragment>));
  }
  return typeof a === 'string' ? <p>{a}</p> : a;
}

export default function Faq({ items }) {
  return (
    <div className="faq">
      {items.map((item, i) => (
        <details key={item.id ?? i} id={item.id}>
          <summary>{item.q}</summary>
          <div className="answer"><Answer a={item.a} /></div>
        </details>
      ))}
    </div>
  );
}
