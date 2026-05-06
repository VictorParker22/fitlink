// App-wide constants

export const APP_NAME = 'FitLink';
export const APP_TAGLINE = 'Grow Your Gym. One Client at a Time.';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'clients', label: 'Clients', path: '/clients' },
  { id: 'referrals', label: 'Referrals', path: '/referrals' },
  { id: 'schedule', label: 'Schedule', path: '/schedule' },
  { id: 'profile', label: 'Profile', path: '/profile' },
];

export const CLIENT_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRIAL: 'trial',
};

export const REFERRAL_STATUSES = {
  PENDING: 'pending',
  SIGNED_UP: 'signed_up',
  ACTIVE: 'active',
  EXPIRED: 'expired',
};

export const REFERRAL_TIERS = [
  { name: 'Bronze', min: 0, max: 5, color: '#CD7F32', icon: '🥉' },
  { name: 'Silver', min: 5, max: 15, color: '#C0C0C0', icon: '🥈' },
  { name: 'Gold', min: 15, max: 30, color: '#FFD700', icon: '🥇' },
  { name: 'Platinum', min: 30, max: Infinity, color: '#E5E4E2', icon: '💎' },
];

export const SESSION_TYPES = {
  ONE_ON_ONE: '1-on-1',
  GROUP: 'Group',
  VIRTUAL: 'Virtual',
};

export const SPECIALIZATIONS = [
  'Strength Training',
  'HIIT',
  'Yoga',
  'Pilates',
  'CrossFit',
  'Boxing',
  'Cardio',
  'Nutrition',
  'Weight Loss',
  'Bodybuilding',
  'Functional Training',
  'Mobility',
];

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HOURS = Array.from({ length: 14 }, (_, i) => i + 6); // 6 AM to 7 PM
