// What the pages say about getting the iPhone app (launch plan W3; review 2026-10-25, the flag-off copy). With
// VITE_APP_STORE_LIVE=on (`storeLive`) the app is public and the words point to the App Store; off, no page tells
// anyone to get an app they can't get: the app isn't public yet and the coach sends the link when it is. Pure, so
// `node --test src/web/site/appCopy.test.js` pins both builds.
import { siteCopy } from '../appleAuth.js';
import { BRAND_NAME } from './brand.js';

const NOT_PUBLIC = `The ${BRAND_NAME} iPhone app isn’t public yet`;

/** Home FAQ "Do my athletes need the app to pay?". */
export function homeNeedAppA(storeLive, appleEnabled) {
  if (storeLive) return siteCopy(appleEnabled).homeNeedAppA;
  return `No. They pay on your page in any browser. ${NOT_PUBLIC}: you send them the link when it’s available, and their plan is waiting when they sign in ${appleEnabled ? 'the same way they paid' : 'with the same email'}.`;
}

/** /athletes step 3: { title, body }. */
export function athletesStep3(storeLive, appleEnabled) {
  const body = siteCopy(appleEnabled).athletesStep3;
  if (storeLive) return { title: 'Open the app', body };
  return { title: 'The app comes from your coach', body: `${NOT_PUBLIC}; your coach sends you the link when it’s available. ${body}` };
}

/** Checkout's done step, under "Open the app": `first` is the coach's first name, `apple` the way this person signed in. */
export function checkoutNoAppNote(storeLive, { first, apple }) {
  const how = apple ? 'Apple' : 'the same email code';
  if (storeLive) return `No app yet? Install ${BRAND_NAME} from the App Store, sign in with ${how}, and the pass is already there.`;
  return `No app yet? ${NOT_PUBLIC}; ${first} sends you the link when it’s available. Sign in there with ${how}, and the pass is already there.`;
}
