import { useNavigate } from 'react-router-dom';
import { useClient } from './ClientContext';
import { IconCheck, IconX, IconDumbbell, IconClock } from '../../components/Icons';
import Header from '../../components/Header';
import './ClientPortal.css';

export default function ClientWorkoutsPage() {
  const { workouts, markWorkoutComplete, markWorkoutSkipped } = useClient();
  const navigate = useNavigate();

  const assigned = workouts.filter((w) => w.status === 'assigned');
  const completed = workouts.filter((w) => w.status === 'completed');
  const skipped = workouts.filter((w) => w.status === 'skipped');

  const statusColors = { assigned: 'var(--accent)', completed: 'var(--green)', skipped: 'var(--text-tertiary)' };

  const renderWorkoutCard = (cw, showActions = false) => {
    const workout = cw.workouts;
    if (!workout) return null;
    const exerciseCount = workout.workout_exercises?.length || 0;

    return (
      <div className="cw-card" key={cw.id} onClick={() => navigate(`/client/workouts/${cw.id}`)} style={{ cursor: 'pointer' }}>
        <div className="cw-status-dot" style={{ background: statusColors[cw.status] }} />
        <div className="cw-info">
          <span className="cw-name">{workout.name}</span>
          <span className="cw-meta">
            {exerciseCount} exercises · {workout.estimated_duration || 45}min
            {cw.assigned_date && ` · ${new Date(cw.assigned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
          </span>
          {/* Exercise list preview */}
          {workout.workout_exercises && (
            <div className="flex-col gap-xs mt-sm" style={{ paddingLeft: 4 }}>
              {workout.workout_exercises.slice(0, 3).map((we, i) => (
                <span key={we.id} className="text-small" style={{ color: 'var(--text-secondary)' }}>
                  {i + 1}. {we.exercises?.name} — {we.sets}×{we.reps}
                </span>
              ))}
              {workout.workout_exercises.length > 3 && (
                <span className="text-small">+{workout.workout_exercises.length - 3} more</span>
              )}
            </div>
          )}
        </div>
        {showActions && cw.status === 'assigned' && (
          <div className="cw-actions">
            <button
              className="btn btn-sm"
              style={{ background: 'var(--green-soft)', color: 'var(--green)' }}
              onClick={() => markWorkoutComplete(cw.id)}
            >
              <IconCheck size={14} /> Done
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
              onClick={() => markWorkoutSkipped(cw.id)}
            >
              Skip
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-content">
      <Header title="My Workouts" subtitle={`${assigned.length} assigned`} />

      {/* Assigned */}
      {assigned.length > 0 && (
        <>
          <div className="section-header mt-xl">
            <h2>To Do</h2>
            <span className="badge badge-lime">{assigned.length}</span>
          </div>
          <div className="flex-col gap-sm">
            {assigned.map((cw) => renderWorkoutCard(cw, true))}
          </div>
        </>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <div className="section-header mt-xl">
            <h2>Completed</h2>
          </div>
          <div className="flex-col gap-sm">
            {completed.map((cw) => renderWorkoutCard(cw))}
          </div>
        </>
      )}

      {/* Skipped */}
      {skipped.length > 0 && (
        <>
          <div className="section-header mt-xl">
            <h2>Skipped</h2>
          </div>
          <div className="flex-col gap-sm">
            {skipped.map((cw) => renderWorkoutCard(cw))}
          </div>
        </>
      )}

      {workouts.length === 0 && (
        <div className="empty-state mt-3xl">
          <IconDumbbell size={40} color="var(--text-tertiary)" />
          <p className="text-body">No workouts assigned yet</p>
          <p className="text-small">Your trainer will assign workouts here</p>
        </div>
      )}
    </div>
  );
}
