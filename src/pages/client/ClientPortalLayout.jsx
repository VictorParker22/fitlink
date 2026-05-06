import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { IconDashboard, IconWorkout, IconMessage, IconProfile } from '../../components/Icons';
import './ClientPortal.css';

const navItems = [
  { id: 'home', label: 'Home', path: '/client', icon: IconDashboard },
  { id: 'workouts', label: 'Workouts', path: '/client/workouts', icon: IconWorkout },
  { id: 'messages', label: 'Messages', path: '/client/messages', icon: IconMessage },
  { id: 'profile', label: 'Profile', path: '/client/profile', icon: IconProfile },
];

export default function ClientPortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/client') return location.pathname === '/client';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-shell">
      <Outlet />
      <nav className="bottom-nav" id="client-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              id={`client-nav-${item.id}`}
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
    </div>
  );
}
