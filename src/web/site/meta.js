// Per-page <title> and meta description for the marketing and policy pages.
// The SPA has one index.html, so each page sets its own on mount and restores
// the home values when it leaves.
import { useEffect } from 'react';
import { BRAND_NAME } from './brand';

export const HOME_TITLE = 'FitLink — Run your coaching business from one app';
export const HOME_DESCRIPTION = 'FitLink is where independent coaches sell passes, build seasons and run their athletes’ weeks. Athletes pay on the web or in the app; Stripe pays the coach.';

/** Adds a class to <body> while the page is mounted (overscroll colour). */
export function useBodyClass(name) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
}

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} — ${BRAND_NAME}` : HOME_TITLE;
    const tag = document.querySelector('meta[name="description"]');
    if (tag) tag.setAttribute('content', description || HOME_DESCRIPTION);
    return () => {
      document.title = HOME_TITLE;
      if (tag) tag.setAttribute('content', HOME_DESCRIPTION);
    };
  }, [title, description]);
}
