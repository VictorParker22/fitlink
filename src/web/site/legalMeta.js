import { BRAND_NAME } from './brand.js';
// Title, meta description, date and the "On this page" list for each legal
// document. The text itself is privacyContent.jsx / termsContent.jsx.
export const LEGAL_UPDATED = '27 October 2026';
// The Terms changed on 17 October 2026: switching coaches or deleting an
// account ends the pass that day, with no refund of time already paid; a
// season is billed a fixed number of payments and then stops by itself, and
// when a pass stops billing, the coach's plan is no longer part of it (§4).
// They changed again on 27 October 2026: Coach Elite is also sold on the
// website through Stripe and ends when the account is deleted (§6, §11), and
// the date-of-birth sentence is gone (no date of birth is collected).
export const TERMS_UPDATED = '27 October 2026';

const PRIVACY_SECTIONS = [
  { id: 'plain', label: 'In plain words' },
  { id: 'collect', label: '1. Information we collect' },
  { id: 'use', label: '2. How we use your data' },
  { id: 'health', label: '3. Fitness and health data' },
  { id: 'share', label: '4. Data sharing' },
  { id: 'security', label: '5. Storage and security' },
  { id: 'rights', label: '6. Your rights' },
  { id: 'children', label: '7. Children’s privacy' },
  { id: 'changes', label: '8. Changes to this policy' },
  { id: 'contact', label: '9. Contact us' },
];

const TERMS_SECTIONS = [
  { id: 'plain', label: 'In plain words' },
  { id: 's1', label: '1. Who we are' },
  { id: 's2', label: `2. Coaches, athletes and ${BRAND_NAME}` },
  { id: 's3', label: '3. Your account' },
  { id: 's4', label: '4. Passes and subscriptions' },
  { id: 's5', label: '5. Payments, fees, refunds, disputes' },
  { id: 's6', label: '6. Coach Elite, our website and the App Store' },
  { id: 's7', label: '7. Acceptable use' },
  { id: 's8', label: '8. Content and ownership' },
  { id: 's9', label: '9. Health and safety' },
  { id: 's10', label: '10. Messages and notifications' },
  { id: 's11', label: '11. Ending your account' },
  { id: 's12', label: '12. Disclaimers' },
  { id: 's13', label: '13. Limitation of liability' },
  { id: 's14', label: '14. Indemnity' },
  { id: 's15', label: '15. Governing law and disputes' },
  { id: 's16', label: '16. Changes to these terms' },
  { id: 's17', label: '17. Contact' },
];

export const LEGAL_DOCS = {
  privacy: {
    title: 'Privacy Policy',
    description: `What ${BRAND_NAME} collects, why, who sees it (your coach, Stripe, Apple, Supabase, Google for the coach’s assistant) and how to delete it. No ads, no tracking, no selling of data.`,
    updated: LEGAL_UPDATED,
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Terms of Service',
    description: `The terms for using ${BRAND_NAME}: coaches sell training passes, athletes buy them, payments run through Stripe, Coach Elite is sold through Apple and on our website.`,
    updated: TERMS_UPDATED,
    sections: TERMS_SECTIONS,
  },
};
