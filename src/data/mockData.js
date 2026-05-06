// Mock data for FitLink MVP

const today = new Date();
const daysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const daysFromNow = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const setTime = (dateStr, hour, min = 0) => {
  const d = new Date(dateStr);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};

// --- Trainer ---
export const trainer = {
  id: 'trainer-001',
  name: 'Mike Johnson',
  email: 'mike@fitlink.com',
  phone: '+1 (555) 234-5678',
  bio: 'Certified personal trainer with 8+ years of experience. Specializing in strength training and HIIT. Passionate about helping clients reach their full potential.',
  specializations: ['Strength Training', 'HIIT', 'Weight Loss', 'Nutrition'],
  certifications: ['NASM Certified Personal Trainer', 'ACE Group Fitness', 'Precision Nutrition Level 1'],
  joinedDate: '2024-03-15',
  referralCode: 'MIKE-FIT2024',
  avatar: null,
  stats: {
    totalClients: 24,
    activeClients: 18,
    totalReferrals: 22,
    monthlyRevenue: 8450,
  },
};

// --- Clients ---
export const clients = [
  {
    id: 'client-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1 (555) 111-2233',
    avatar: null,
    status: 'active',
    planId: 'plan-002',
    joinedDate: daysAgo(120),
    lastSession: daysAgo(1),
    referredBy: null,
    progress: {
      weight: [165, 162, 160, 158, 155, 153, 151],
      dates: [daysAgo(180), daysAgo(150), daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(2)],
      workoutsThisMonth: 14,
      streak: 8,
    },
    notes: 'Focused on toning and endurance. Prefers morning sessions. Allergic to latex.',
  },
  {
    id: 'client-002',
    name: 'James Rodriguez',
    email: 'james.r@email.com',
    phone: '+1 (555) 222-3344',
    avatar: null,
    status: 'active',
    planId: 'plan-003',
    joinedDate: daysAgo(90),
    lastSession: daysAgo(0),
    referredBy: 'client-001',
    progress: {
      weight: [195, 192, 190, 188, 186],
      dates: [daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(2)],
      workoutsThisMonth: 18,
      streak: 12,
    },
    notes: 'Training for a marathon. Needs low-impact alternatives for knee. Great consistency.',
  },
  {
    id: 'client-003',
    name: 'Emily Park',
    email: 'emily.p@email.com',
    phone: '+1 (555) 333-4455',
    avatar: null,
    status: 'active',
    planId: 'plan-001',
    joinedDate: daysAgo(60),
    lastSession: daysAgo(3),
    referredBy: 'client-002',
    progress: {
      weight: [140, 139, 138, 137],
      dates: [daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(2)],
      workoutsThisMonth: 8,
      streak: 3,
    },
    notes: 'Beginner. Building foundational strength. Very enthusiastic!',
  },
  {
    id: 'client-004',
    name: 'Marcus Thompson',
    email: 'marcus.t@email.com',
    phone: '+1 (555) 444-5566',
    avatar: null,
    status: 'active',
    planId: 'plan-003',
    joinedDate: daysAgo(200),
    lastSession: daysAgo(1),
    referredBy: null,
    progress: {
      weight: [210, 208, 205, 202, 200, 198, 195],
      dates: [daysAgo(210), daysAgo(180), daysAgo(150), daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(2)],
      workoutsThisMonth: 20,
      streak: 15,
    },
    notes: 'Bodybuilding focus. Competing in October. Needs strict macro tracking.',
  },
  {
    id: 'client-005',
    name: 'Olivia Martinez',
    email: 'olivia.m@email.com',
    phone: '+1 (555) 555-6677',
    avatar: null,
    status: 'trial',
    planId: 'plan-001',
    joinedDate: daysAgo(5),
    lastSession: daysAgo(2),
    referredBy: 'client-004',
    progress: {
      weight: [155],
      dates: [daysAgo(5)],
      workoutsThisMonth: 2,
      streak: 2,
    },
    notes: 'Free trial from referral. Interested in yoga and HIIT combo.',
  },
  {
    id: 'client-006',
    name: 'David Kim',
    email: 'david.k@email.com',
    phone: '+1 (555) 666-7788',
    avatar: null,
    status: 'active',
    planId: 'plan-002',
    joinedDate: daysAgo(150),
    lastSession: daysAgo(4),
    referredBy: null,
    progress: {
      weight: [180, 178, 176, 174, 172, 170],
      dates: [daysAgo(180), daysAgo(150), daysAgo(120), daysAgo(90), daysAgo(60), daysAgo(2)],
      workoutsThisMonth: 12,
      streak: 6,
    },
    notes: 'Works night shifts. Flexible scheduling needed. Prefers compound movements.',
  },
  {
    id: 'client-007',
    name: 'Aisha Patel',
    email: 'aisha.p@email.com',
    phone: '+1 (555) 777-8899',
    avatar: null,
    status: 'active',
    planId: 'plan-002',
    joinedDate: daysAgo(80),
    lastSession: daysAgo(1),
    referredBy: 'client-001',
    progress: {
      weight: [135, 133, 132, 130],
      dates: [daysAgo(90), daysAgo(60), daysAgo(30), daysAgo(2)],
      workoutsThisMonth: 16,
      streak: 10,
    },
    notes: 'Post-pregnancy fitness recovery. Cleared by doctor. Focus on core rehab.',
  },
  {
    id: 'client-008',
    name: 'Ryan O\'Brien',
    email: 'ryan.ob@email.com',
    phone: '+1 (555) 888-9900',
    avatar: null,
    status: 'inactive',
    planId: null,
    joinedDate: daysAgo(300),
    lastSession: daysAgo(45),
    referredBy: null,
    progress: {
      weight: [200, 198, 197],
      dates: [daysAgo(300), daysAgo(250), daysAgo(200)],
      workoutsThisMonth: 0,
      streak: 0,
    },
    notes: 'Paused membership due to travel. Plans to return next month.',
  },
  {
    id: 'client-009',
    name: 'Lisa Wang',
    email: 'lisa.w@email.com',
    phone: '+1 (555) 999-0011',
    avatar: null,
    status: 'active',
    planId: 'plan-001',
    joinedDate: daysAgo(30),
    lastSession: daysAgo(0),
    referredBy: 'client-007',
    progress: {
      weight: [145, 143],
      dates: [daysAgo(30), daysAgo(2)],
      workoutsThisMonth: 10,
      streak: 5,
    },
    notes: 'New client. Very motivated. Interested in group classes too.',
  },
  {
    id: 'client-010',
    name: 'Tom Bradley',
    email: 'tom.b@email.com',
    phone: '+1 (555) 101-2020',
    avatar: null,
    status: 'active',
    planId: 'plan-003',
    joinedDate: daysAgo(180),
    lastSession: daysAgo(2),
    referredBy: null,
    progress: {
      weight: [225, 220, 218, 215, 212, 210],
      dates: [daysAgo(210), daysAgo(180), daysAgo(150), daysAgo(120), daysAgo(60), daysAgo(2)],
      workoutsThisMonth: 15,
      streak: 7,
    },
    notes: 'Former athlete. Rehabbing shoulder injury. No overhead pressing.',
  },
  {
    id: 'client-011',
    name: 'Nina Petrova',
    email: 'nina.p@email.com',
    phone: '+1 (555) 111-3030',
    avatar: null,
    status: 'trial',
    planId: 'plan-001',
    joinedDate: daysAgo(3),
    lastSession: daysAgo(1),
    referredBy: 'client-009',
    progress: {
      weight: [128],
      dates: [daysAgo(3)],
      workoutsThisMonth: 1,
      streak: 1,
    },
    notes: 'Trial session. Wants flexibility + strength combo. Might sign up for Pro.',
  },
  {
    id: 'client-012',
    name: 'Carlos Mendez',
    email: 'carlos.m@email.com',
    phone: '+1 (555) 121-4040',
    avatar: null,
    status: 'inactive',
    planId: null,
    joinedDate: daysAgo(250),
    lastSession: daysAgo(60),
    referredBy: 'client-004',
    progress: {
      weight: [190, 188, 186],
      dates: [daysAgo(250), daysAgo(200), daysAgo(150)],
      workoutsThisMonth: 0,
      streak: 0,
    },
    notes: 'Cancelled due to relocation. Might rejoin virtually.',
  },
];

// --- Subscription Plans ---
export const plans = [
  {
    id: 'plan-001',
    name: 'Basic',
    price: 29,
    period: 'month',
    features: ['2 sessions per week', 'Basic workout plans', 'Email support', 'Progress tracking'],
    color: '#3B82F6',
    subscriberCount: 4,
    popular: false,
  },
  {
    id: 'plan-002',
    name: 'Pro',
    price: 59,
    period: 'month',
    features: ['4 sessions per week', 'Custom workout plans', 'Nutrition guidance', 'Priority scheduling', '24/7 chat support'],
    color: '#FF5F3B',
    subscriberCount: 8,
    popular: true,
  },
  {
    id: 'plan-003',
    name: 'Elite',
    price: 99,
    period: 'month',
    features: ['Unlimited sessions', 'Personalized meal plans', 'Body composition analysis', 'Video form reviews', 'VIP scheduling', 'Monthly check-ins'],
    color: '#FF6B35',
    subscriberCount: 6,
    popular: false,
  },
];

// --- Referrals ---
export const referrals = [
  { id: 'ref-001', referredName: 'James Rodriguez', referredBy: 'client-001', status: 'active', date: daysAgo(90), reward: 50 },
  { id: 'ref-002', referredName: 'Emily Park', referredBy: 'client-002', status: 'active', date: daysAgo(60), reward: 50 },
  { id: 'ref-003', referredName: 'Olivia Martinez', referredBy: 'client-004', status: 'signed_up', date: daysAgo(5), reward: 25 },
  { id: 'ref-004', referredName: 'Aisha Patel', referredBy: 'client-001', status: 'active', date: daysAgo(80), reward: 50 },
  { id: 'ref-005', referredName: 'Lisa Wang', referredBy: 'client-007', status: 'active', date: daysAgo(30), reward: 50 },
  { id: 'ref-006', referredName: 'Nina Petrova', referredBy: 'client-009', status: 'signed_up', date: daysAgo(3), reward: 25 },
  { id: 'ref-007', referredName: 'Carlos Mendez', referredBy: 'client-004', status: 'expired', date: daysAgo(250), reward: 0 },
  { id: 'ref-008', referredName: 'Alex Foster', referredBy: 'client-002', status: 'pending', date: daysAgo(2), reward: 0 },
  { id: 'ref-009', referredName: 'Diana Wu', referredBy: 'client-006', status: 'pending', date: daysAgo(1), reward: 0 },
  { id: 'ref-010', referredName: 'Kevin Brooks', referredBy: 'client-001', status: 'active', date: daysAgo(45), reward: 50 },
  { id: 'ref-011', referredName: 'Mia Torres', referredBy: 'client-004', status: 'active', date: daysAgo(70), reward: 50 },
  { id: 'ref-012', referredName: 'Jake Lee', referredBy: 'client-007', status: 'signed_up', date: daysAgo(10), reward: 25 },
  { id: 'ref-013', referredName: 'Priya Singh', referredBy: 'client-002', status: 'pending', date: daysAgo(0), reward: 0 },
  { id: 'ref-014', referredName: 'Ben Carter', referredBy: 'client-010', status: 'active', date: daysAgo(100), reward: 50 },
  { id: 'ref-015', referredName: 'Sofia Rossi', referredBy: 'client-006', status: 'active', date: daysAgo(55), reward: 50 },
  { id: 'ref-016', referredName: 'Tyler Nash', referredBy: 'client-001', status: 'active', date: daysAgo(110), reward: 50 },
  { id: 'ref-017', referredName: 'Hannah Lee', referredBy: 'client-010', status: 'signed_up', date: daysAgo(7), reward: 25 },
  { id: 'ref-018', referredName: 'Oscar Diaz', referredBy: 'client-004', status: 'active', date: daysAgo(130), reward: 50 },
  { id: 'ref-019', referredName: 'Zoe Adams', referredBy: 'client-007', status: 'pending', date: daysAgo(0), reward: 0 },
  { id: 'ref-020', referredName: 'Ethan Cole', referredBy: 'client-002', status: 'active', date: daysAgo(40), reward: 50 },
  { id: 'ref-021', referredName: 'Lily Chang', referredBy: 'client-009', status: 'active', date: daysAgo(20), reward: 50 },
  { id: 'ref-022', referredName: 'Sam Mitchell', referredBy: 'client-010', status: 'signed_up', date: daysAgo(4), reward: 25 },
];

// --- Sessions / Schedule ---
export const sessions = [
  { id: 'ses-001', clientId: 'client-001', date: setTime(daysFromNow(0), 7, 0), duration: 60, type: '1-on-1', status: 'completed', notes: 'Upper body focus' },
  { id: 'ses-002', clientId: 'client-002', date: setTime(daysFromNow(0), 9, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Leg day + cardio' },
  { id: 'ses-003', clientId: 'client-004', date: setTime(daysFromNow(0), 11, 0), duration: 90, type: '1-on-1', status: 'upcoming', notes: 'Competition prep' },
  { id: 'ses-004', clientId: 'client-007', date: setTime(daysFromNow(0), 14, 0), duration: 45, type: '1-on-1', status: 'upcoming', notes: 'Core rehab session' },
  { id: 'ses-005', clientId: 'client-009', date: setTime(daysFromNow(0), 16, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Full body intro' },
  { id: 'ses-006', clientId: 'client-003', date: setTime(daysFromNow(1), 8, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Strength foundations' },
  { id: 'ses-007', clientId: 'client-006', date: setTime(daysFromNow(1), 10, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Compound lifts' },
  { id: 'ses-008', clientId: 'client-010', date: setTime(daysFromNow(1), 13, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Shoulder rehab + lower body' },
  { id: 'ses-009', clientId: null, date: setTime(daysFromNow(1), 17, 0), duration: 45, type: 'Group', status: 'upcoming', notes: 'HIIT Bootcamp', groupName: 'Evening HIIT' },
  { id: 'ses-010', clientId: 'client-005', date: setTime(daysFromNow(2), 9, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Trial session #3' },
  { id: 'ses-011', clientId: 'client-001', date: setTime(daysFromNow(2), 11, 0), duration: 60, type: 'Virtual', status: 'upcoming', notes: 'Check-in & form review' },
  { id: 'ses-012', clientId: 'client-011', date: setTime(daysFromNow(2), 14, 0), duration: 45, type: '1-on-1', status: 'upcoming', notes: 'Flexibility assessment' },
  { id: 'ses-013', clientId: 'client-002', date: setTime(daysFromNow(3), 7, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Long run prep' },
  { id: 'ses-014', clientId: 'client-004', date: setTime(daysFromNow(3), 10, 0), duration: 90, type: '1-on-1', status: 'upcoming', notes: 'Posing + posing practice' },
  { id: 'ses-015', clientId: null, date: setTime(daysFromNow(4), 8, 0), duration: 45, type: 'Group', status: 'upcoming', notes: 'Morning Yoga Flow', groupName: 'Morning Yoga' },
  { id: 'ses-016', clientId: 'client-007', date: setTime(daysFromNow(4), 10, 0), duration: 45, type: '1-on-1', status: 'upcoming', notes: 'Core + mobility' },
  { id: 'ses-017', clientId: 'client-009', date: setTime(daysFromNow(5), 9, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Upper body' },
  { id: 'ses-018', clientId: 'client-006', date: setTime(daysFromNow(5), 15, 0), duration: 60, type: '1-on-1', status: 'upcoming', notes: 'Evening session - deadlifts' },
];

// --- Activity Feed ---
export const activities = [
  { id: 'act-001', type: 'referral', message: 'Priya Singh was referred by James Rodriguez', timestamp: daysAgo(0) },
  { id: 'act-002', type: 'session', message: 'Completed session with Sarah Chen — Upper body focus', timestamp: daysAgo(0) },
  { id: 'act-003', type: 'signup', message: 'Nina Petrova started a free trial', timestamp: daysAgo(1) },
  { id: 'act-004', type: 'payment', message: 'Monthly payment received from David Kim — $59', timestamp: daysAgo(1) },
  { id: 'act-005', type: 'referral', message: 'Zoe Adams was referred by Aisha Patel', timestamp: daysAgo(1) },
  { id: 'act-006', type: 'milestone', message: 'Marcus Thompson hit a 15-day workout streak! 🔥', timestamp: daysAgo(2) },
  { id: 'act-007', type: 'signup', message: 'Sam Mitchell signed up via referral link', timestamp: daysAgo(4) },
  { id: 'act-008', type: 'payment', message: 'Monthly payment received from Tom Bradley — $99', timestamp: daysAgo(3) },
  { id: 'act-009', type: 'session', message: 'Completed group session — Evening HIIT (8 attendees)', timestamp: daysAgo(3) },
  { id: 'act-010', type: 'referral', message: 'Alex Foster was referred by James Rodriguez', timestamp: daysAgo(2) },
];

// --- Revenue Data (Last 6 months) ---
export const revenueData = [
  { month: 'Dec', amount: 5200 },
  { month: 'Jan', amount: 5800 },
  { month: 'Feb', amount: 6400 },
  { month: 'Mar', amount: 7100 },
  { month: 'Apr', amount: 7900 },
  { month: 'May', amount: 8450 },
];

// --- Trainer Availability ---
export const availability = {
  monday: { start: '06:00', end: '19:00' },
  tuesday: { start: '06:00', end: '19:00' },
  wednesday: { start: '07:00', end: '18:00' },
  thursday: { start: '06:00', end: '19:00' },
  friday: { start: '06:00', end: '17:00' },
  saturday: { start: '08:00', end: '14:00' },
  sunday: null, // Day off
};

// --- Leaderboard ---
export const leaderboard = [
  { rank: 1, name: 'Coach Mike', referrals: 22, avatar: null, isYou: true },
  { rank: 2, name: 'Sarah Fit', referrals: 19, avatar: null, isYou: false },
  { rank: 3, name: 'Jake Power', referrals: 15, avatar: null, isYou: false },
  { rank: 4, name: 'Amy Strong', referrals: 12, avatar: null, isYou: false },
  { rank: 5, name: 'Chris Lift', referrals: 8, avatar: null, isYou: false },
];
