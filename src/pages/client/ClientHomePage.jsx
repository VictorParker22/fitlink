import { useClient } from './ClientContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/Avatar';
import { IconClock, IconDumbbell, IconFire, IconChevronRight } from '../../components/Icons';
import { staggerDelay } from '../../utils/helpers';
import './ClientPortal.css';

export default function ClientHomePage() {
  const { clientData, trainer, upcomingSessions, todayWorkout, workouts } = useClient();
  const navigate = useNavigate();

  if (!clientData) return null;

  const progress = clientData.progress || { streak: 0, workoutsThisMonth: 0 };
  const completedCount = workouts.filter((w) => w.status === 'completed').length;

  return (
    <div className="page-content">
      {/* Greeting */}
      <div className="mt-lg">
        <p className="client-portal-greeting">Welcome back</p>
        <h1 className="client-portal-name">{clientData.name.split(' ')[0]} 💪</h1>
        {trainer && (
          <p className="text-small mt-sm">Training with Coach {trainer.name.split(' ')[0]}</p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="flex-row gap-md mt-xl" style={{ overflowX: 'auto' }}>
        <div className="card" style={{ flex: '0 0 auto', padding: '12px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--blue)' }}>{completedCount}</span>
          <span className="text-small" style={{ display: 'block' }}>Completed</span>
        </div>
        <div className="card" style={{ flex: '0 0 auto', padding: '12px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: '#FF9F0A' }}>
            🔥 {progress.streak || 0}
          </span>
          <span className="text-small" style={{ display: 'block' }}>Day Streak</span>
        </div>
        <div className="card" style={{ flex: '0 0 auto', padding: '12px 16px', textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, color: 'var(--green)' }}>
            {upcomingSessions.length}
          </span>
          <span className="text-small" style={{ display: 'block' }}>Upcoming</span>
        </div>
      </div>

      {/* Today's Workout */}
      {todayWorkout && (
        <>
          <div className="section-header mt-2xl">
            <h2>Today's Workout</h2>
          </div>
          <button className="cp-today-card" onClick={() => navigate('/client/workouts')}>
            <span className="cp-today-label">Assigned today</span>
            <h3 className="cp-today-name">{todayWorkout.workouts?.name || 'Workout'}</h3>
            <div className="cp-today-meta">
              <span><IconDumbbell size={14} /> {todayWorkout.workouts?.workout_exercises?.length || 0} exercises</span>
              <span><IconClock size={14} /> {todayWorkout.workouts?.estimated_duration || 45}min</span>
            </div>
            <div className="cp-today-btn">Start Workout →</div>
          </button>
        </>
      )}

      {/* Upcoming Sessions */}
      <div className="section-header mt-2xl">
        <h2>Upcoming Sessions</h2>
      </div>
      {upcomingSessions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p className="text-body">No upcoming sessions</p>
          <p className="text-small">Your trainer will schedule your next session</p>
        </div>
      ) : (
        <div className="flex-col gap-sm">
          {upcomingSessions.slice(0, 4).map((session, i) => {
            const d = new Date(session.date);
            return (
              <div className="card stagger-item" key={session.id} style={staggerDelay(i)}>
                <div className="flex-row gap-md">
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-soft)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0
                  }}>
                    <IconClock size={18} color="var(--accent)" />
                  </div>
                  <div className="flex-1">
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>
                      {session.type} Session
                    </span>
                    <div className="flex-row gap-sm mt-sm">
                      <span className="text-small">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-small">
                        · {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span className="text-small">· {session.duration}min</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
