import { BRAND_NAME } from './brand.js';
// Title, meta description, date and the "On this page" list for each legal document (the
// design's page_legal.py). The text itself is privacyContent.jsx / termsContent.jsx, whose
// Body renders one <h2 id> per entry after `plain`; Legal.jsx renders the plain-words card.
// Both documents are the owner's Benchside versions of 29 October 2026.
export const LEGAL_UPDATED = '29 October 2026';
export const TERMS_UPDATED = '29 October 2026';

const PRIVACY_SECTIONS = [
  { id: 'plain', label: 'In plain words' },
  { id: 'collect', label: '1. Information we collect' },
  { id: 'use', label: '2. How we use your data' },
  { id: 'health', label: '3. Fitness and health data' },
  { id: 'sharing', label: '4. Data sharing' },
  { id: 'security', label: '5. Data storage and security' },
  { id: 'rights', label: '6. Your rights' },
  { id: 'children', label: '7. Children’s privacy' },
  { id: 'changes', label: '8. Changes to this policy' },
  { id: 'contact', label: '9. Contact us' },
];

const TERMS_SECTIONS = [
  { id: 'plain', label: 'In plain words' },
  { id: 'who', label: '1. Who we are and what these terms cover' },
  { id: 'roles', label: `2. Coaches, athletes and ${BRAND_NAME}` },
  { id: 'account', label: '3. Your account' },
  { id: 'passes', label: '4. Passes and subscriptions (athletes)' },
  { id: 'payments', label: '5. Payments, fees, refunds and disputes' },
  { id: 'elite', label: '6. Coach Elite, our website and the App Store' },
  { id: 'use', label: '7. Acceptable use' },
  { id: 'content', label: '8. Content and ownership' },
  { id: 'health', label: '9. Health and safety' },
  { id: 'messages', label: '10. Messages and notifications' },
  { id: 'ending', label: '11. Ending your account' },
  { id: 'disclaimers', label: '12. Disclaimers' },
  { id: 'liability', label: '13. Limitation of liability' },
  { id: 'indemnity', label: '14. Indemnity' },
  { id: 'law', label: '15. Governing law and disputes' },
  { id: 'changes', label: '16. Changes to these terms' },
  { id: 'contact', label: '17. Contact' },
];

export const LEGAL_DOCS = {
  privacy: {
    title: 'Privacy Policy',
    description: `How ${BRAND_NAME} collects, uses and protects coach and athlete data: what your coach sees, Stripe payments, Apple Health, the assistant, and your rights.`,
    updated: LEGAL_UPDATED,
    sections: PRIVACY_SECTIONS,
  },
  terms: {
    title: 'Terms of Service',
    description: `The terms for using ${BRAND_NAME} as a coach or an athlete: passes, payments, refunds, Coach Elite, acceptable use, health and safety, and your account.`,
    updated: TERMS_UPDATED,
    sections: TERMS_SECTIONS,
  },
};
