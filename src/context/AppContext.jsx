import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { requestNotificationPermission, scheduleSessionReminder } from '../lib/notifications';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user, signOut } = useAuth();
  const [trainer, setTrainer] = useState(null);
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const reminderTimers = useRef([]);

  // Fetch all data when user is authenticated
  useEffect(() => {
    if (!user) {
      setTrainer(null);
      setClients([]);
      setPlans([]);
      setReferrals([]);
      setSessions([]);
      setActivities([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchAll() {
      setLoading(true);
      try {
        const [trainerRes, clientsRes, plansRes, sessionsRes, referralsRes, activitiesRes] = await Promise.all([
          supabase.from('trainers').select('*').eq('id', user.id).single(),
          supabase.from('clients').select('*').order('created_at', { ascending: false }),
          supabase.from('plans').select('*').order('price'),
          supabase.from('sessions').select('*').order('date'),
          supabase.from('referrals').select('*').order('date', { ascending: false }),
          supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(20),
        ]);

        if (!mounted) return;

        if (trainerRes.data) setTrainer(trainerRes.data);
        if (clientsRes.data) setClients(clientsRes.data);
        if (plansRes.data) setPlans(plansRes.data);
        if (sessionsRes.data) setSessions(sessionsRes.data);
        if (referralsRes.data) setReferrals(referralsRes.data);
        if (activitiesRes.data) setActivities(activitiesRes.data);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchAll();
    return () => {
      mounted = false;
      reminderTimers.current.forEach(clearTimeout);
    };
  }, [user]);

  // Manual refresh (after onboarding, etc)
  const refreshData = useCallback(async () => {
    if (!user) return;
    const [trainerRes, clientsRes, plansRes, sessionsRes, referralsRes, activitiesRes] = await Promise.all([
      supabase.from('trainers').select('*').eq('id', user.id).single(),
      supabase.from('clients').select('*').order('created_at', { ascending: false }),
      supabase.from('plans').select('*').order('price'),
      supabase.from('sessions').select('*').order('date'),
      supabase.from('referrals').select('*').order('date', { ascending: false }),
      supabase.from('activities').select('*').order('timestamp', { ascending: false }).limit(20),
    ]);
    if (trainerRes.data) setTrainer(trainerRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (plansRes.data) setPlans(plansRes.data);
    if (sessionsRes.data) setSessions(sessionsRes.data);
    if (referralsRes.data) setReferrals(referralsRes.data);
    if (activitiesRes.data) setActivities(activitiesRes.data);
  }, [user]);

  // Schedule notifications for upcoming sessions
  useEffect(() => {
    reminderTimers.current.forEach(clearTimeout);
    reminderTimers.current = [];

    if (!sessions.length || !clients.length) return;

    requestNotificationPermission();

    const upcoming = sessions.filter((s) => s.status === 'upcoming' && new Date(s.date) > new Date());
    upcoming.forEach((session) => {
      const client = clients.find((c) => c.id === session.client_id);
      const timerId = scheduleSessionReminder(session, client?.name || session.group_name);
      if (timerId) reminderTimers.current.push(timerId);
    });
  }, [sessions, clients]);

  // --- Client operations ---
  const addClient = useCallback(async (clientData) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...clientData, trainer_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setClients((prev) => [data, ...prev]);

    // Add activity
    await supabase.from('activities').insert({
      trainer_id: user.id,
      type: 'signup',
      message: `${data.name} was added as a new client`,
    });

    return data;
  }, [user]);

  const updateClient = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setClients((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  }, []);

  const getClientById = useCallback((id) => {
    return clients.find((c) => c.id === id);
  }, [clients]);

  // --- Plan operations ---
  const getPlanById = useCallback((id) => {
    return plans.find((p) => p.id === id);
  }, [plans]);

  // --- Session operations ---
  const addSession = useCallback(async (sessionData) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ ...sessionData, trainer_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setSessions((prev) => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));

    // Add activity
    const client = clients.find((c) => c.id === sessionData.client_id);
    await supabase.from('activities').insert({
      trainer_id: user.id,
      type: 'session',
      message: `Session booked with ${client?.name || sessionData.group_name || 'client'}`,
    });

    return data;
  }, [user, clients]);

  const updateSession = useCallback(async (id, updates) => {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setSessions((prev) => prev.map((s) => (s.id === id ? data : s)));

    // Log activity for completed sessions
    if (updates.status === 'completed') {
      const session = sessions.find((s) => s.id === id);
      const client = session ? clients.find((c) => c.id === session.client_id) : null;
      await supabase.from('activities').insert({
        trainer_id: user.id,
        type: 'session',
        message: `Session completed with ${client?.name || session?.group_name || 'client'}`,
      });
    }
    return data;
  }, [user, sessions, clients]);

  const getClientSessions = useCallback((clientId) => {
    return sessions.filter((s) => s.client_id === clientId);
  }, [sessions]);

  const getSessionsForDate = useCallback((date) => {
    const target = new Date(date);
    return sessions.filter((s) => {
      const sd = new Date(s.date);
      return sd.getFullYear() === target.getFullYear() &&
        sd.getMonth() === target.getMonth() &&
        sd.getDate() === target.getDate();
    });
  }, [sessions]);

  // --- Trainer operations ---
  const updateTrainer = useCallback(async (updates) => {
    const { data, error } = await supabase
      .from('trainers')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setTrainer(data);
    return data;
  }, [user]);

  // --- Referral operations ---
  const addReferral = useCallback(async (referralData) => {
    const { data, error } = await supabase
      .from('referrals')
      .insert({ ...referralData, trainer_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setReferrals((prev) => [data, ...prev]);
    return data;
  }, [user]);

  // --- Computed values ---
  const activeClients = clients.filter((c) => c.status === 'active');
  const trialClients = clients.filter((c) => c.status === 'trial');
  const inactiveClients = clients.filter((c) => c.status === 'inactive');

  const totalReferrals = referrals.length;
  const activeReferrals = referrals.filter((r) => r.status === 'active').length;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length;
  const referralEarnings = referrals.reduce((sum, r) => sum + Number(r.reward || 0), 0);
  const conversionRate = totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0;

  const todaySessions = getSessionsForDate(new Date());
  const upcomingSessions = sessions
    .filter((s) => new Date(s.date) > new Date() && s.status === 'upcoming')
    .slice(0, 5);

  // Revenue data (derived from plans)
  const totalMonthlyRevenue = plans.reduce((sum, p) => {
    const subCount = clients.filter((c) => c.plan_id === p.id && c.status !== 'inactive').length;
    return sum + Number(p.price) * subCount;
  }, 0);

  // Simple revenue chart data (we'll use the last 6 months with slight variation)
  const revenueData = [
    { month: 'Dec', amount: Math.round(totalMonthlyRevenue * 0.62) },
    { month: 'Jan', amount: Math.round(totalMonthlyRevenue * 0.69) },
    { month: 'Feb', amount: Math.round(totalMonthlyRevenue * 0.76) },
    { month: 'Mar', amount: Math.round(totalMonthlyRevenue * 0.84) },
    { month: 'Apr', amount: Math.round(totalMonthlyRevenue * 0.94) },
    { month: 'May', amount: totalMonthlyRevenue },
  ];

  // Leaderboard (static for now — would need a multi-trainer query)
  const leaderboard = [
    { rank: 1, name: trainer?.name || 'You', referrals: totalReferrals, isYou: true },
    { rank: 2, name: 'Sarah Fit', referrals: Math.max(totalReferrals - 3, 0), isYou: false },
    { rank: 3, name: 'Jake Power', referrals: Math.max(totalReferrals - 7, 0), isYou: false },
    { rank: 4, name: 'Amy Strong', referrals: Math.max(totalReferrals - 10, 0), isYou: false },
    { rank: 5, name: 'Chris Lift', referrals: Math.max(totalReferrals - 14, 0), isYou: false },
  ];

  const value = {
    loading,
    trainer,
    setTrainer,
    updateTrainer,
    clients,
    setClients,
    addClient,
    updateClient,
    plans,
    referrals,
    setReferrals,
    addReferral,
    sessions,
    addSession,
    updateSession,
    activities,
    revenueData,
    leaderboard,
    logout: signOut,
    getClientById,
    getPlanById,
    getClientSessions,
    getSessionsForDate,
    activeClients,
    trialClients,
    inactiveClients,
    totalReferrals,
    activeReferrals,
    pendingReferrals,
    referralEarnings,
    conversionRate,
    todaySessions,
    upcomingSessions,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
