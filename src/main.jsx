import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import CoachPublicPage from './web/CoachPublicPage.jsx'
import CoachWeb from './web/CoachWeb.jsx'

// The landing page at /, a coach's public page at /i/CODE (and /live/CODE,
// the same card for a live link), the coach's web editor under /coach.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/i/:code" element={<CoachPublicPage />} />
        <Route path="/live/:code" element={<CoachPublicPage />} />
        <Route path="/coach/*" element={<CoachWeb />} />
        <Route path="*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
