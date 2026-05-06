import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import Avatar from '../components/Avatar';
import ProgressChart from '../components/ProgressChart';
import ProgressStats from '../components/ProgressStats';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUploadModal from '../components/PhotoUploadModal';
import { IconMail, IconPhone, IconFire, IconSchedule, IconNote, IconDollar, IconMessage, IconWorkout, IconTrendUp, IconDumbbell, IconPlus } from '../components/Icons';
import { formatDate, formatCurrency, staggerDelay } from '../utils/helpers';
import './ClientDetailPage.css';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { getClientById, getPlanById, getClientSessions } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('progress');
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const client = getClientById(id);

  // Fetch workout logs for progress analytics
  const fetchProgress = useCallback(async () => {
    if (!id) return;
    setProgressLoading(true);
    try {
      // Get all workout logs for this client
      const { data: logs } = await supabase
        .from('workout_logs')
        .select('*, workout_exercises(*, exercises(name, category))')
        .eq('client_id', id)
        .order('logged_at', { ascending: true });

      // Get client_workouts for completion tracking
      const { data: clientWorkouts } = await supabase
        .from('client_workouts')
        .select('*')
        .eq('client_id', id)
        .order('assigned_at', { ascending: false });

      if (!logs || logs.length === 0) {
        setProgressData({ empty: true });
        setProgressLoading(false);
        return;
      }

      // --- Compute volume over time (group by day) ---
      const volumeByDay = {};
      const exerciseMaxWeight = {};
      let totalVolume = 0;

      logs.forEach((log) => {
        if (!log.completed) return;
        const day = new Date(log.logged_at).toISOString().split('T')[0];
        const vol = Number(log.weight || 0) * Number(log.reps || 0);
        volumeByDay[day] = (volumeByDay[day] || 0) + vol;
        totalVolume += vol;

        // Track PRs per exercise
        const exName = log.workout_exercises?.exercises?.name || 'Unknown';
        const w = Number(log.weight || 0);
        if (w > 0) {
          if (!exerciseMaxWeight[exName] || w > exerciseMaxWeight[exName].weight) {
            exerciseMaxWeight[exName] = { weight: w, date: log.logged_at };
          }
        }
      });

      // Volume chart data (last 14 entries or all)
      const volumeEntries = Object.entries(volumeByDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, value]) => ({ date, value: Math.round(value) }));

      // --- Compute streak ---
      const workoutDays = [...new Set(
        logs.filter((l) => l.completed).map((l) => new Date(l.logged_at).toISOString().split('T')[0])
      )].sort().reverse();

      let streak = 0;
      if (workoutDays.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        // Streak counts if last workout was today or yesterday
        if (workoutDays[0] === today || workoutDays[0] === yesterday) {
          streak = 1;
          for (let i = 1; i < workoutDays.length; i++) {
            const curr = new Date(workoutDays[i - 1]);
            const prev = new Date(workoutDays[i]);
            const diffDays = (curr - prev) / 86400000;
            if (diffDays <= 1) streak++;
            else break;
          }
        }
      }

      // --- Completion rate ---
      const totalWorkouts = clientWorkouts?.length || 0;
      const completedWorkouts = clientWorkouts?.filter((w) => w.status === 'completed').length || 0;
      const completionRate = totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

      // --- PRs ---
      const prs = Object.entries(exerciseMaxWeight)
        .sort((a, b) => b[1].weight - a[1].weight)
        .slice(0, 5)
        .map(([name, data]) => ({ name, ...data }));

      // --- Top exercises by volume ---
      const exerciseVolume = {};
      logs.forEach((log) => {
        if (!log.completed) return;
        const exName = log.workout_exercises?.exercises?.name || 'Unknown';
        const vol = Number(log.weight || 0) * Number(log.reps || 0);
        exerciseVolume[exName] = (exerciseVolume[exName] || 0) + vol;
      });
      const topExercises = Object.entries(exerciseVolume)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, volume]) => ({ name, volume: Math.round(volume) }));

      // --- Recent workout history ---
      const workoutHistory = (clientWorkouts || []).slice(0, 10).map((cw) => {
        const cwLogs = logs.filter((l) => l.client_workout_id === cw.id);
        const setsCompleted = cwLogs.filter((l) => l.completed).length;
        const totalSets = cwLogs.length;
        const cwVolume = cwLogs.reduce((sum, l) => sum + (l.completed ? Number(l.weight || 0) * Number(l.reps || 0) : 0), 0);
        return { ...cw, setsCompleted, totalSets, volume: Math.round(cwVolume) };
      });

      setProgressData({
        empty: false,
        volumeChart: volumeEntries,
        totalVolume: Math.round(totalVolume),
        streak,
        prCount: prs.length,
        completionRate,
        prs,
        topExercises,
        workoutHistory,
        totalWorkouts,
        completedWorkouts,
        totalLogs: logs.filter((l) => l.completed).length,
      });
    } catch (err) {
      console.error('Error fetching progress:', err);
      setProgressData({ empty: true });
    } finally {
      setProgressLoading(false);
    }
  }, [id]);

  // Fetch progress photos
  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setPhotosLoading(true);
    try {
      const { data } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', id)
        .order('taken_at', { ascending: false });
      setPhotos(data || []);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Fetch photos when tab is opened
  useEffect(() => {
    if (activeTab === 'photos') {
      fetchPhotos();
    }
  }, [activeTab, fetchPhotos]);

  if (!client) {
    return (
      <div className="page-content">
        <Header title="Client Not Found" showBack />
        <div className="empty-state">
          <p className="text-body">This client could not be found.</p>
        </div>
      </div>
    );
  }

  const plan = getPlanById(client.plan_id);
  const sessions = getClientSessions(client.id);
  const memberSince = formatDate(client.joined_date);

  const statusColors = {
    active: { bg: 'var(--green-soft)', color: 'var(--green)', label: 'Active' },
    trial: { bg: 'var(--yellow-soft)', color: '#FF9F0A', label: 'Trial' },
    inactive: { bg: 'rgba(142,142,147,0.12)', color: 'var(--text-tertiary)', label: 'Inactive' },
  };
  const status = statusColors[client.status] || statusColors.active;

  const tabs = [
    { id: 'progress', label: 'Progress' },
    { id: 'photos', label: 'Photos' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'plan', label: 'Plan' },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div className="page-content client-detail-page">
      <Header title="" showBack />

      {/* Client Profile Header */}
      <div className="client-profile-header">
        <Avatar name={client.name} size="xl" />
        <h1 className="heading-2 mt-base">{client.name}</h1>
        <div className="flex-row gap-sm mt-sm">
          <span className="badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
          {plan && <span className="badge" style={{ background: `${plan.color}20`, color: plan.color }}>{plan.name}</span>}
        </div>
        <p className="text-small mt-sm">Member since {memberSince}</p>

        {/* Quick Stats — now from real data */}
        <div className="client-quick-stats mt-lg">
          <div className="cqs-item">
            <span className="cqs-value" style={{ color: 'var(--blue)' }}>
              {progressData && !progressData.empty ? progressData.completedWorkouts : 0}
            </span>
            <span className="cqs-label">Workouts</span>
          </div>
          <div className="cqs-divider" />
          <div className="cqs-item">
            <span className="cqs-value flex-row gap-xs" style={{ color: '#FF9F0A' }}>
              <IconFire size={16} color="#FF9F0A" />{progressData && !progressData.empty ? progressData.streak : 0}
            </span>
            <span className="cqs-label">Day Streak</span>
          </div>
          <div className="cqs-divider" />
          <div className="cqs-item">
            <span className="cqs-value" style={{ color: 'var(--green)' }}>{sessions.length}</span>
            <span className="cqs-label">Sessions</span>
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex-row gap-md mt-lg">
          <a href={`mailto:${client.email}`} className="btn btn-secondary btn-sm flex-1">
            <IconMail size={14} /> Email
          </a>
          <a href={`tel:${client.phone}`} className="btn btn-secondary btn-sm flex-1">
            <IconPhone size={14} /> Call
          </a>
          <button className="btn btn-primary btn-sm flex-1" onClick={() => navigate(`/messages`)}>
            <IconMessage size={14} /> Chat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mt-xl">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
            id={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content mt-lg">

        {/* ========== PROGRESS TAB (REAL DATA) ========== */}
        {activeTab === 'progress' && (
          <div className="stagger-item">
            {progressLoading ? (
              <div className="flex-center mt-3xl">
                <div className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              </div>
            ) : progressData?.empty ? (
              <div className="empty-state">
                <IconDumbbell size={40} color="var(--text-tertiary)" />
                <p className="text-body mt-base">No workout data yet</p>
                <p className="text-small">Once this client logs their first workout, progress will appear here.</p>
              </div>
            ) : (
              <>
                {/* Stats chips */}
                <ProgressStats stats={{
                  totalVolume: progressData.totalVolume,
                  streak: progressData.streak,
                  prCount: progressData.prCount,
                  completionRate: progressData.completionRate,
                }} />

                {/* Volume chart */}
                <div className="card mt-base">
                  <ProgressChart
                    data={progressData.volumeChart}
                    label="Training Volume (lbs)"
                    color="var(--accent)"
                    mode="bar"
                    emptyMessage="Log some workouts to see volume trends"
                  />
                </div>

                {/* Personal Records */}
                {progressData.prs.length > 0 && (
                  <div className="card mt-base">
                    <h3 className="heading-3 mb-base">🏆 Personal Records</h3>
                    {progressData.prs.map((pr, i) => (
                      <div className="summary-row" key={i}>
                        <span className="text-small">{pr.name}</span>
                        <span className="summary-val" style={{ color: 'var(--accent)' }}>{pr.weight} lbs</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top Exercises */}
                {progressData.topExercises.length > 0 && (
                  <div className="card mt-base">
                    <h3 className="heading-3 mb-base">Top Exercises by Volume</h3>
                    {progressData.topExercises.map((ex, i) => {
                      const maxVol = progressData.topExercises[0].volume;
                      return (
                        <div className="top-exercise-row" key={i}>
                          <div className="top-ex-info">
                            <span className="text-small">{ex.name}</span>
                            <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>
                              {ex.volume >= 1000 ? `${(ex.volume / 1000).toFixed(1)}k` : ex.volume} lbs
                            </span>
                          </div>
                          <div className="top-ex-bar">
                            <div
                              className="top-ex-fill"
                              style={{ width: `${(ex.volume / maxVol) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recent Workout History */}
                {progressData.workoutHistory.length > 0 && (
                  <div className="mt-xl">
                    <h3 className="heading-3 mb-base">Recent Workouts</h3>
                    <div className="flex-col gap-sm">
                      {progressData.workoutHistory.map((wh, i) => (
                        <div className="card wh-card stagger-item" key={wh.id} style={staggerDelay(i)}>
                          <div className="flex-row flex-between">
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>
                                {wh.status === 'completed' ? '✅' : '⏳'} Workout
                              </p>
                              <p className="text-small mt-sm">
                                {new Date(wh.assigned_at).toLocaleDateString('en-US', {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="flex-col" style={{ alignItems: 'flex-end', gap: 4 }}>
                              <span className="text-small" style={{ color: 'var(--text-tertiary)' }}>
                                {wh.setsCompleted}/{wh.totalSets} sets
                              </span>
                              {wh.volume > 0 && (
                                <span className="text-small" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                                  {wh.volume >= 1000 ? `${(wh.volume / 1000).toFixed(1)}k` : wh.volume} lbs
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========== PHOTOS TAB ========== */}
        {activeTab === 'photos' && (
          <div className="stagger-item" id="photos-tab-content">
            <button
              className="btn btn-primary btn-sm mb-lg"
              onClick={() => setShowPhotoUpload(true)}
            >
              <IconPlus size={14} /> Add Photo
            </button>

            {photosLoading ? (
              <div className="flex-center mt-xl">
                <div className="btn-spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
              </div>
            ) : photos.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: 40 }}>📸</span>
                <p className="text-body mt-base">No progress photos yet</p>
                <p className="text-small">Upload before & after photos to track visual transformation.</p>
              </div>
            ) : (
              <PhotoGallery
                photos={photos}
                onDelete={async (photo) => {
                  await supabase.storage.from('progress-photos').remove([photo.storage_path]);
                  await supabase.from('progress_photos').delete().eq('id', photo.id);
                  setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                }}
              />
            )}

            {showPhotoUpload && (
              <PhotoUploadModal
                clientId={id}
                trainerId={user?.id}
                onClose={() => setShowPhotoUpload(false)}
                onUploaded={() => fetchPhotos()}
              />
            )}
          </div>
        )}

        {/* ========== SESSIONS TAB ========== */}
        {activeTab === 'sessions' && (
          <div className="flex-col gap-sm">
            {sessions.length === 0 ? (
              <div className="empty-state">
                <IconSchedule size={36} color="var(--text-tertiary)" />
                <p className="text-body">No sessions yet</p>
              </div>
            ) : (
              sessions.map((s, i) => (
                <div className="card session-item stagger-item" key={s.id} style={staggerDelay(i)}>
                  <div className="flex-row flex-between">
                    <div>
                      <p className="session-item-time">
                        {new Date(s.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}
                        {new Date(s.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-small mt-sm">{s.notes}</p>
                    </div>
                    <div className="flex-col gap-xs" style={{ alignItems: 'flex-end' }}>
                      <span className={`badge ${s.status === 'completed' ? 'badge-lime' : 'badge-purple'}`}>
                        {s.status}
                      </span>
                      <span className="text-small">{s.duration}min</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========== PLAN TAB ========== */}
        {activeTab === 'plan' && (
          <div className="stagger-item">
            {plan ? (
              <div className="card card-gradient" style={{ '--gradient-color': plan.color }}>
                <div className="flex-row flex-between mb-base">
                  <h3 className="heading-2" style={{ color: plan.color }}>{plan.name}</h3>
                  <span className="heading-2">{formatCurrency(plan.price)}<span className="text-small">/mo</span></span>
                </div>
                <ul className="plan-features">
                  {plan.features.map((f, i) => (
                    <li key={i} className="plan-feature">
                      <span style={{ color: plan.color }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="empty-state">
                <IconDollar size={36} color="var(--text-tertiary)" />
                <p className="text-body">No active plan</p>
                <button className="btn btn-primary btn-sm">Assign Plan</button>
              </div>
            )}
          </div>
        )}

        {/* ========== NOTES TAB ========== */}
        {activeTab === 'notes' && (
          <div className="stagger-item">
            <div className="card">
              <div className="flex-row gap-sm mb-base">
                <IconNote size={16} color="var(--accent)" />
                <h3 className="heading-3">Trainer Notes</h3>
              </div>
              <p className="text-body" style={{ lineHeight: 1.7 }}>{client.notes || 'No notes yet.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
