import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Workspace } from './pages/Workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { Navbar } from './components/Navbar';

function AppLayout() {
  return (
    <div className="app-layout-shell">
      {/* Viewport-level ambient gradient glows */}
      <div className="ambient ambient-blue" aria-hidden="true" />
      <div className="ambient ambient-purple" aria-hidden="true" />
      <div className="ambient ambient-green" aria-hidden="true" />
      <div className="app-nav-wrapper">
        <Navbar />
      </div>
      <div className="app-page-wrapper">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary
      fallbackTitle="Application Render Failure"
      fallbackMessage="An unexpected rendering issue occurred in GitExplore. You can reload the application safely."
    >
      <NetworkStatusBanner />
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
