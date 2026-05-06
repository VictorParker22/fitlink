import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import OnboardingWizard from './components/OnboardingWizard';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ReferralsPage from './pages/ReferralsPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SchedulePage from './pages/SchedulePage';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import ChatPage from './pages/ChatPage';
import WorkoutsPage from './pages/WorkoutsPage';
import SettingsPage from './pages/SettingsPage';

// Client portal
import { ClientProvider } from './pages/client/ClientContext';
import ClientPortalLayout from './pages/client/ClientPortalLayout';
import ClientHomePage from './pages/client/ClientHomePage';
import ClientWorkoutsPage from './pages/client/ClientWorkoutsPage';
import ClientMessagesPage from './pages/client/ClientMessagesPage';
import ClientProfilePage from './pages/client/ClientProfilePage';
import ClientSignupPage from './pages/client/ClientSignupPage';
import ClientLoginPage from './pages/client/ClientLoginPage';
import ClientWorkoutDetailPage from './pages/client/ClientWorkoutDetailPage';

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div className="btn-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );
}

// --- Trainer Routes ---
function TrainerRoutes() {
  const { loading: dataLoading, trainer, refreshData } = useApp();
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    if (trainer) {
      setShowOnboarding(trainer.onboarding_complete === false);
    }
  }, [trainer]);

  if (dataLoading) return <LoadingScreen />;

  return (
    <div className="app-shell">
      {showOnboarding && (
        <OnboardingWizard onComplete={() => { setShowOnboarding(false); refreshData(); }} />
      )}
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:id" element={<ClientDetailPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:conversationId" element={<ChatPage />} />
        <Route path="/workouts" element={<WorkoutsPage />} />
        <Route path="/referrals" element={<ReferralsPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function TrainerApp() {
  return (
    <AppProvider>
      <TrainerRoutes />
    </AppProvider>
  );
}

// --- Client Routes ---
function ClientRoutes() {
  return (
    <Routes>
      <Route element={<ClientPortalLayout />}>
        <Route index element={<ClientHomePage />} />
        <Route path="workouts" element={<ClientWorkoutsPage />} />
        <Route path="messages" element={<ClientMessagesPage />} />
        <Route path="profile" element={<ClientProfilePage />} />
      </Route>
      <Route path="workouts/:id" element={<ClientWorkoutDetailPage />} />
      <Route path="*" element={<Navigate to="/client" replace />} />
    </Routes>
  );
}

function ClientApp() {
  return (
    <ClientProvider>
      <ClientRoutes />
    </ClientProvider>
  );
}

// --- Root Router ---
function AppRouter() {
  const { isAuthenticated, loading: authLoading, userRole } = useAuth();

  if (authLoading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public client routes (signup/login) */}
      <Route path="/client/signup" element={<ClientSignupPage />} />
      <Route path="/client/login" element={
        isAuthenticated ? <Navigate to="/client" replace /> : <ClientLoginPage />
      } />

      {/* Authenticated routing based on role */}
      {isAuthenticated ? (
        <>
          {userRole === 'client' ? (
            <>
              <Route path="/client/*" element={<ClientApp />} />
              <Route path="*" element={<Navigate to="/client" replace />} />
            </>
          ) : (
            <>
              <Route path="/*" element={<TrainerApp />} />
            </>
          )}
        </>
      ) : (
        <>
          <Route path="/client/*" element={<Navigate to="/client/login" replace />} />
          <Route path="*" element={<LoginPage />} />
        </>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
