// "Continue with Apple", drawn to the HIG's custom-button rules (Sign in with
// Apple → Buttons): black fill, white logo and white title; the logo is Apple's
// own file from Apple Design Resources (Logo-Sign-in-with-Apple.dmg → Left
// Aligned / White / Medium), byte-for-byte, at the button's full height; the
// title is the system font at 43 % of the height; a capsule like every button
// on the site; never smaller than the sign-in button next to it. The title
// never changes (Apple allows only three titles); progress is said under it.
// Licence: Apple's HIG tells developers to use this artwork in custom buttons
// on iOS, macOS and the web; the DMG's bundled licence is Apple's generic one.
// Apple's hosted button image is not used: it sets a cookie and sends every
// visitor's address to Apple when the page loads.
//
// `onPress` is async and resolves true once the browser is leaving for Apple
// (signInWithApple returned); false after showing its own error. Never put the
// button inside a <form>.
import { useEffect, useId, useState } from 'react';
import { APPLE_OPENING, APPLE_TITLE } from './appleAuth';

export default function AppleButton({ onPress, disabled = false, size = 'lg', onBusyChange }) {
  const [leaving, setLeaving] = useState(false);
  const statusId = useId();
  useEffect(() => {
    // Back from Apple's page restores this page from the back/forward cache with leaving=true.
    const onShow = (e) => { if (e.persisted) { setLeaving(false); onBusyChange?.(false); } };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, [onBusyChange]);
  async function press() {
    if (leaving || disabled) return;
    setLeaving(true); onBusyChange?.(true);
    let ok;
    try { ok = (await onPress()) === true; } catch { ok = false; }
    if (!ok) { setLeaving(false); onBusyChange?.(false); }
  }
  return (
    <div className="fl-apple-wrap">
      <button type="button" className={`fl-apple${size === 'md' ? ' md' : ''}`} onClick={press}
        disabled={disabled || leaving} aria-busy={leaving || undefined} aria-describedby={statusId}>
        <img src="/apple/siwa-logo-left-white-medium.svg" alt="" aria-hidden="true" draggable="false" />
        <span>{APPLE_TITLE}</span>
      </button>
      <p id={statusId} className="fl-note" role="status" aria-live="polite">{leaving ? APPLE_OPENING : ''}</p>
    </div>
  );
}
