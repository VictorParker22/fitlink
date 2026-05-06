import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from './Icons';

export default function Header({ title, subtitle, showBack = false, rightAction = null }) {
  const navigate = useNavigate();

  return (
    <header className="page-header">
      <div className="flex-row gap-md" style={{ flex: 1 }}>
        {showBack && (
          <button className="btn-icon btn-secondary" onClick={() => navigate(-1)} id="back-button">
            <IconArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="heading-2" style={{ fontSize: title.length > 18 ? 'var(--fs-lg)' : undefined }}>{title}</h1>
          {subtitle && <p className="text-small">{subtitle}</p>}
        </div>
      </div>
      {rightAction && <div className="header-right">{rightAction}</div>}
    </header>
  );
}
