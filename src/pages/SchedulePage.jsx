import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import BookSessionModal from '../components/BookSessionModal';
import { IconPlus, IconClock } from '../components/Icons';
import { getWeekDates, isSameDay, staggerDelay } from '../utils/helpers';
import './SchedulePage.css';

export default function SchedulePage() {
  const { sessions, getClientById, getSessionsForDate } = useApp();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookSession, setShowBookSession] = useState(false);

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const daySessions = useMemo(() => getSessionsForDate(selectedDate), [selectedDate, sessions]);

  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateWeek = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir * 7);
    setSelectedDate(d);
  };

  const sessionTypeColors = {
    '1-on-1': 'var(--accent)',
    'Group': 'var(--purple)',
    'Virtual': 'var(--blue)',
  };

  return (
    <div className="page-content schedule-page">
      <Header
        title="Schedule"
        subtitle={selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        rightAction={
          <button className="btn btn-primary btn-sm" onClick={() => setShowBookSession(true)} id="add-session-btn">
            <IconPlus size={14} /> Session
          </button>
        }
      />

      {/* Week Navigation */}
      <div className="week-nav mt-lg">
        <button className="week-arrow" onClick={() => navigateWeek(-1)} id="prev-week">‹</button>
        <div className="week-days">
          {weekDates.map((date, i) => {
            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const daySess = getSessionsForDate(date);
            return (
              <button
                key={i}
                className={`day-btn ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => setSelectedDate(new Date(date))}
                id={`day-${i}`}
              >
                <span className="day-name">{dayNames[date.getDay()]}</span>
                <span className="day-num">{date.getDate()}</span>
                {daySess.length > 0 && <div className="day-dot" />}
              </button>
            );
          })}
        </div>
        <button className="week-arrow" onClick={() => navigateWeek(1)} id="next-week">›</button>
      </div>

      {/* Day Title */}
      <div className="section-header mt-xl">
        <h2>
          {isSameDay(selectedDate, today) ? 'Today' :
            selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </h2>
        <span className="text-small">{daySessions.length} session{daySessions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Sessions Timeline */}
      {daySessions.length === 0 ? (
        <div className="empty-state">
          <IconClock size={40} color="var(--text-muted)" />
          <p className="text-body">No sessions scheduled</p>
          <button className="btn btn-outline btn-sm">+ Add Session</button>
        </div>
      ) : (
        <div className="timeline">
          {daySessions.map((session, i) => {
            const client = getClientById(session.client_id);
            const sessionDate = new Date(session.date);
            const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
            const typeColor = sessionTypeColors[session.type] || 'var(--accent)';

            return (
              <div className="timeline-item stagger-item" key={session.id} style={staggerDelay(i)}>
                <div className="timeline-time">
                  <span className="tl-start">{sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="tl-end">{endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                </div>
                <div className="timeline-line">
                  <div className="tl-dot" style={{ background: typeColor }} />
                  <div className="tl-bar" style={{ background: `${typeColor}30` }} />
                </div>
                <div className="card timeline-card" style={{ borderLeft: `3px solid ${typeColor}` }}>
                  <div className="flex-row gap-md">
                    {client ? (
                      <Avatar name={client.name} size="sm" />
                    ) : (
                      <div className="avatar avatar-sm" style={{ background: 'var(--purple)', color: 'white', fontSize: '10px' }}>G</div>
                    )}
                    <div className="flex-1">
                      <span className="tl-client-name">{client ? client.name : session.group_name}</span>
                      <div className="flex-row gap-sm mt-sm">
                        <span className="badge" style={{ background: `${typeColor}20`, color: typeColor }}>
                          {session.type}
                        </span>
                        <span className="text-small">{session.duration}min</span>
                      </div>
                      {session.notes && <p className="text-small mt-sm" style={{ color: 'var(--text-secondary)' }}>{session.notes}</p>}
                    </div>
                    {session.status === 'completed' && (
                      <span className="badge badge-lime">Done</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showBookSession && (
        <BookSessionModal
          onClose={() => setShowBookSession(false)}
          preselectedDate={selectedDate}
        />
      )}
    </div>
  );
}
