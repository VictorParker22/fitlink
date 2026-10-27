// Per-page <title> and meta description for the marketing and policy pages.
// The SPA has one index.html, so each page sets its own on mount and restores
// the home values when it leaves.
import { useEffect } from 'react';
import { HOME_DESCRIPTION, HOME_TITLE, pageTitle } from './pageMeta.js';

export { HOME_DESCRIPTION, HOME_TITLE };

/** Adds a class to <body> while the page is mounted (overscroll colour). */
export function useBodyClass(name) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
}

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = pageTitle(title);
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', description || HOME_DESCRIPTION);
    return () => {
      document.title = HOME_TITLE;
      if (tag) tag.setAttribute('content', HOME_DESCRIPTION);
    };
  }, [title, description]);
}
