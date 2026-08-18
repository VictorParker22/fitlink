import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Shell from './landing/components/Shell.jsx';
import './landing/landing.css';

/**
 * Router for the marketing site.
 *
 * Every nav tab is a real route with its own URL and its own three.js
 * scene, not an anchor into one long scroll. Pages are lazy so the home
 * route's first paint never pays for the other four; the Suspense fallback
 * is a plain dark viewport rather than a spinner, because between two
 * same-styled pages a flash of spinner is more jarring than 100ms of calm.
 *
 * /privacy and /delete-account are static HTML served by vercel rewrites —
 * they must NOT become SPA routes, because Google Play's reviewer follows
 * the delete-account URL with JavaScript disabled.
 */

const HomePage = lazy(() => import('./landing/pages/HomePage.jsx'));
const CoachesPage = lazy(() => import('./landing/pages/CoachesPage.jsx'));
const AthletesPage = lazy(() => import('./landing/pages/AthletesPage.jsx'));
const GymsPage = lazy(() => import('./landing/pages/GymsPage.jsx'));
const PricingPage = lazy(() => import('./landing/pages/PricingPage.jsx'));

const Calm = () => <div style={{ minHeight: '100vh', background: '#101210' }} />;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Suspense fallback={<Calm />}><HomePage /></Suspense>} />
          <Route path="coaches" element={<Suspense fallback={<Calm />}><CoachesPage /></Suspense>} />
          <Route path="athletes" element={<Suspense fallback={<Calm />}><AthletesPage /></Suspense>} />
          <Route path="gyms" element={<Suspense fallback={<Calm />}><GymsPage /></Suspense>} />
          <Route path="pricing" element={<Suspense fallback={<Calm />}><PricingPage /></Suspense>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
