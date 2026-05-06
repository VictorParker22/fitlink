import { getInitials } from '../utils/helpers';

const AVATAR_COLORS = [
  '#5B8DEF',
  '#FF5F3B',
  '#34C759',
  '#BF5AF2',
  '#FF9F0A',
  '#30D5C8',
  '#FF453A',
  '#5E5CE6',
  '#AC8E68',
  '#64D2FF',
];

export default function Avatar({ name, size = 'md', src = null, className = '' }) {
  const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : size === 'xl' ? 'avatar-xl' : '';
  const colorIndex = name ? (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length : 0;
  const bg = AVATAR_COLORS[colorIndex];

  return (
    <div
      className={`avatar ${sizeClass} ${className}`}
      style={{ background: src ? 'none' : bg, color: 'white' }}
    >
      {src ? <img src={src} alt={name} /> : getInitials(name || '??')}
    </div>
  );
}
