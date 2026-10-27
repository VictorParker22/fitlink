// One <details> list, the shape every page's questions use (Web-Home FAQ,
// Web-Pricing, Web-Athletes, Web-Support). `items` = [{ q, a, id? }]; `a` may
// be a string or JSX.
export default function Faq({ items, labelledBy }) {
  return (
    <div className="s-faq" aria-labelledby={labelledBy}>
      {items.map((item, i) => (
        <details key={item.id ?? i} id={item.id}>
          <summary>{item.q}</summary>
          {typeof item.a === 'string' ? <p>{item.a}</p> : item.a}
        </details>
      ))}
    </div>
  );
}
