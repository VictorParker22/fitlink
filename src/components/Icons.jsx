// Re-export Lucide icons with our component aliases
// This keeps all imports like `import { IconPlus } from './Icons'` working
// while using Lucide's beautifully crafted icons underneath.

import {
  LayoutGrid,
  Users,
  Share2,
  CalendarDays,
  User,
  Search,
  Plus,
  ArrowLeft,
  Clock,
  TrendingUp,
  DollarSign,
  Star,
  Flame,
  Mail,
  Phone,
  Link,
  Copy,
  Check,
  X,
  ChevronRight,
  Bell,
  LogOut,
  SquarePen,
  Target,
  Trophy,
  MessageSquare,
  Dumbbell,
  QrCode,
  Settings,
  Award,
  FileText,
  Send,
  GripVertical,
  Trash2,
  ListChecks,
  ClipboardList,
} from 'lucide-react';

// --- Wrapper factory ---
// Lucide uses `size` and `color` props natively, but we add `className`
// passthrough for extra flexibility.
const wrap = (LucideIcon) => {
  const Wrapped = ({ size, color = 'currentColor', className, ...rest }) => (
    <LucideIcon
      size={size}
      color={color}
      className={className}
      strokeWidth={1.75}
      {...rest}
    />
  );
  Wrapped.displayName = LucideIcon.displayName;
  return Wrapped;
};

// --- Navigation ---
export const IconDashboard = wrap(LayoutGrid);
export const IconClients = wrap(Users);
export const IconReferral = wrap(Share2);
export const IconSchedule = wrap(CalendarDays);
export const IconProfile = wrap(User);

// --- Actions ---
export const IconSearch = wrap(Search);
export const IconPlus = wrap(Plus);
export const IconArrowLeft = wrap(ArrowLeft);
export const IconCheck = wrap(Check);
export const IconX = wrap(X);
export const IconCopy = wrap(Copy);
export const IconEdit = wrap(SquarePen);
export const IconLink = wrap(Link);

// --- Status / Data ---
export const IconClock = wrap(Clock);
export const IconTrendUp = wrap(TrendingUp);
export const IconDollar = wrap(DollarSign);
export const IconStar = wrap(Star);
export const IconFire = wrap(Flame);
export const IconTarget = wrap(Target);
export const IconTrophy = wrap(Trophy);
export const IconAward = wrap(Award);
export const IconNote = wrap(FileText);

// --- Communication ---
export const IconMail = wrap(Mail);
export const IconPhone = wrap(Phone);
export const IconMessage = wrap(MessageSquare);
export const IconBell = wrap(Bell);

// --- Misc ---
export const IconChevronRight = wrap(ChevronRight);
export const IconLogout = wrap(LogOut);
export const IconDumbbell = wrap(Dumbbell);
export const IconQrCode = wrap(QrCode);
export const IconSettings = wrap(Settings);
export const IconSend = wrap(Send);
export const IconGrip = wrap(GripVertical);
export const IconTrash = wrap(Trash2);
export const IconListChecks = wrap(ListChecks);
export const IconWorkout = wrap(ClipboardList);

// --- Brand icons (kept as custom SVG since Lucide doesn't include brand marks) ---
export function IconWhatsApp({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
