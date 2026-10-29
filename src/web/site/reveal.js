// The design's one motion (site.js "Reveal on scroll"): an element with class "reveal" fades up
// the first time it scrolls into view. The CSS keys on <html class="js">, so without JavaScript
// nothing is ever hidden. The static design observed the page once at load; a SPA renders new
// elements on every route change and after data arrives, so the observer is rebuilt per pathname
// and a MutationObserver picks up what a page renders later (a search result, a loaded list).
import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** The design's margin: an element counts as in view once 8 % of the viewport's height is above its top. */
const ROOT_MARGIN = '0px 0px -8% 0px';

/**
 * Observes every `.reveal` under `rootRef.current` (the document when no ref is given) and adds
 * `in` once it intersects the viewport. Called once, from the shell.
 */
export function useReveal(rootRef) {
  const { pathname } = useLocation();

  // Before the first paint, not after it: with the class on, the CSS keeps a .reveal invisible
  // until it is observed, so content never paints visible, vanishes and fades in a second time.
  useLayoutEffect(() => {
    document.documentElement.classList.add('js');
  }, []);

  useEffect(() => {
    const root = rootRef?.current ?? document;
    if (!('IntersectionObserver' in window)) {
      root.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
      return undefined;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: ROOT_MARGIN });
    const watch = (scope) => {
      if (scope.matches?.('.reveal:not(.in)')) io.observe(scope);
      scope.querySelectorAll?.('.reveal:not(.in)').forEach((el) => io.observe(el));
    };
    watch(root);
    // Elements the page renders after this effect ran (childList only: adding "in" is a class
    // change and never re-enters here).
    const mo = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => { if (node.nodeType === 1) watch(node); });
      });
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname, rootRef]);
}
