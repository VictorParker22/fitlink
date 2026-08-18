/**
 * App shell for the FitLink marketing site.
 *
 * The landing page moved to src/landing/ so the 3D hero, its styles and its
 * copy live together and can be lazy-loaded as one unit. The previous
 * 256-line App.jsx held the whole page inline, along with a fabricated
 * "trusted by" band and invented testimonials — see LandingPage.jsx for what
 * was removed and why.
 */
import LandingPage from './landing/LandingPage.jsx';

export default function App() {
  return <LandingPage />;
}
