// Utility helpers

export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function generateReferralCode(name) {
  const cleanName = name.replace(/\s/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}-${random}`;
}

export function getReferralTier(count) {
  if (count >= 30) return { name: 'Platinum', color: '#E5E4E2', icon: '💎' };
  if (count >= 15) return { name: 'Gold', color: '#FFD700', icon: '🥇' };
  if (count >= 5) return { name: 'Silver', color: '#C0C0C0', icon: '🥈' };
  return { name: 'Bronze', color: '#CD7F32', icon: '🥉' };
}

export function getNextTierProgress(count) {
  if (count >= 30) return { current: count, target: count, percent: 100, nextTier: 'Platinum' };
  if (count >= 15) return { current: count, target: 30, percent: ((count - 15) / 15) * 100, nextTier: 'Platinum' };
  if (count >= 5) return { current: count, target: 15, percent: ((count - 5) / 10) * 100, nextTier: 'Gold' };
  return { current: count, target: 5, percent: (count / 5) * 100, nextTier: 'Silver' };
}

export function getDayName(date) {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
}

export function getWeekDates(startDate = new Date()) {
  const start = new Date(startDate);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export function staggerDelay(index, base = 60) {
  return { animationDelay: `${index * base}ms` };
}
