import { useEffect, useState } from 'react';
import { readCountry, webEliteOffered } from './eliteRegion';

/**
 * Whether this visitor may be offered Coach Elite on the website: null while the country is being read, then true or
 * false. The dev server has no /api/geo, so it always offers.
 */
export function useWebEliteOffered() {
  const dev = Boolean(import.meta.env?.DEV);
  const [offered, setOffered] = useState(dev ? true : null);
  useEffect(() => {
    if (dev) return undefined;
    let alive = true;
    readCountry().then((c) => { if (alive) setOffered(webEliteOffered(c)); });
    return () => { alive = false; };
  }, [dev]);
  return offered;
}
