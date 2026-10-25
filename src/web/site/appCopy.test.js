// The app-availability copy in both builds (W3). Run: node --test src/web/site/appCopy.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { athletesStep3, checkoutNoAppNote, homeNeedAppA } from './appCopy.js';
import { siteCopy } from '../appleAuth.js';
import { BRAND_NAME } from './brand.js';

const all = (storeLive) => [true, false].flatMap((apple) => [
  homeNeedAppA(storeLive, apple),
  athletesStep3(storeLive, apple).title,
  athletesStep3(storeLive, apple).body,
  checkoutNoAppNote(storeLive, { first: 'Dana', apple }),
]);

test('flag on: the App Store wording', () => {
  assert.equal(homeNeedAppA(true, false), siteCopy(false).homeNeedAppA);
  assert.deepEqual(athletesStep3(true, true), { title: 'Open the app', body: siteCopy(true).athletesStep3 });
  assert.equal(checkoutNoAppNote(true, { first: 'Dana', apple: true }), `No app yet? Install ${BRAND_NAME} from the App Store, sign in with Apple, and the pass is already there.`);
  assert.equal(checkoutNoAppNote(true, { first: 'Dana', apple: false }), `No app yet? Install ${BRAND_NAME} from the App Store, sign in with the same email code, and the pass is already there.`);
});

test('flag off: nobody is told to get an app they can’t get', () => {
  for (const s of all(false)) {
    assert.doesNotMatch(s, /App Store|get the app to train|Install /, s);
  }
  assert.equal(homeNeedAppA(false, false), `No. They pay on your page in any browser. The ${BRAND_NAME} iPhone app isn’t public yet: you send them the link when it’s available, and their plan is waiting when they sign in with the same email.`);
  assert.deepEqual(athletesStep3(false, false), {
    title: 'The app comes from your coach',
    body: `The ${BRAND_NAME} iPhone app isn’t public yet; your coach sends you the link when it’s available. ${siteCopy(false).athletesStep3}`,
  });
  assert.equal(checkoutNoAppNote(false, { first: 'Dana', apple: true }), `No app yet? The ${BRAND_NAME} iPhone app isn’t public yet; Dana sends you the link when it’s available. Sign in there with Apple, and the pass is already there.`);
});
