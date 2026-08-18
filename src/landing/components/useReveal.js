import { useEffect } from 'react';

/**
 * useReveal — scroll-triggered entrances for everything marked [data-reveal].
 *
 * One IntersectionObserver per page, driven by CSS classes, so the effect
 * costs nothing while idle. Elements start slightly low and transparent and
 * settle when ~15% visible; stagger comes from data-reveal="2|3" setting a
 * transition delay, letting a row of cards arrive as a cascade rather than
 * a block.
 *
 * Reveal happens ONCE — un-revealing on scroll-up makes a page feel like it
 * is performing rather than existing. Under prefers-reduced-motion the CSS
 * shows everything immediately and this observer just cleans the flags.
 */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!els.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('fl-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
