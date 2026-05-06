import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const { user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchClientData() {
      setLoading(true);
      try {
        // Get client record
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (!client || !mounted) {
          setLoading(false);
          return;
        }
        setClientData(client);

        // Fetch trainer, sessions, workouts, conversation in parallel
        const [trainerRes, sessionsRes, workoutsRes, convRes] = await Promise.all([
          supabase.from('trainers').select('*').eq('id', client.trainer_id).single(),
          supabase.from('sessions').select('*').eq('client_id', client.id).order('date'),
          supabase
            .from('client_workouts')
            .select('*, workouts(*, workout_exercises(*, exercises(*)))')
            .eq('client_id', client.id)
            .order('assigned_date', { ascending: false }),
          supabase
            .from('conversations')
            .select('*')
            .eq('client_id', client.id)
            .single(),
        ]);

        if (!mounted) return;
        if (trainerRes.data) setTrainer(trainerRes.data);
        if (sessionsRes.data) setSessions(sessionsRes.data);
        if (workoutsRes.data) setWorkouts(workoutsRes.data);
        if (convRes.data) setConversation(convRes.data);
      } catch (err) {
        console.error('Error loading client data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchClientData();
    return () => { mounted = false; };
  }, [user]);

  const markWorkoutComplete = useCallback(async (clientWorkoutId) => {
    const { error } = await supabase
      .from('client_workouts')
      .update({ status: 'completed' })
      .eq('id', clientWorkoutId);
    if (!error) {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === clientWorkoutId ? { ...w, status: 'completed' } : w))
      );
    }
  }, []);

  const markWorkoutSkipped = useCallback(async (clientWorkoutId) => {
    const { error } = await supabase
      .from('client_workouts')
      .update({ status: 'skipped' })
      .eq('id', clientWorkoutId);
    if (!error) {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === clientWorkoutId ? { ...w, status: 'skipped' } : w))
      );
    }
  }, []);

  const upcomingSessions = sessions.filter(
    (s) => new Date(s.date) > new Date() && s.status === 'upcoming'
  );

  const todayWorkout = workouts.find((w) => {
    const d = new Date(w.assigned_date);
    const today = new Date();
    return d.toDateString() === today.toDateString() && w.status === 'assigned';
  });

  const value = {
    loading,
    clientData,
    trainer,
    sessions,
    workouts,
    conversation,
    upcomingSessions,
    todayWorkout,
    markWorkoutComplete,
    markWorkoutSkipped,
  };

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) throw new Error('useClient must be used within ClientProvider');
  return context;
}
