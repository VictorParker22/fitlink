import { useNavigate, useLocation } from 'react-router-dom';
import { IconDashboard, IconClients, IconMessage, IconWorkout, IconProfile } from './Icons';
import './BottomNav.css';

const navItems = [
  { id: 'dashboard', label: 'Home', path: '/', icon: IconDashboard },
  { id: 'clients', label: 'Clients', path: '/clients', icon: IconClients },
  { id: 'messages', label: 'Messages', path: '/messages', icon: IconMessage },
  { id: 'workouts', label: 'Workouts', path: '/workouts', icon: IconWorkout },
  { id: 'profile', label: 'Profile', path: '/profile', icon: IconProfile },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide nav on chat page (full-screen experience)
  if (location.pathname.startsWith('/messages/')) return null;

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav" id="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <button
            key={item.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            id={`nav-${item.id}`}
          >
            <div className="nav-icon-wrap">
              {active && <div className="nav-active-bg" />}
              <Icon size={20} color={active ? '#FAFAFA' : '#636366'} />
            </div>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
