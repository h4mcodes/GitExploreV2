import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { Navbar } from './components/Navbar';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Workspace = lazy(() => import('./pages/Workspace').then((m) => ({ default: m.Workspace })));

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-secondary, #94a3b8)',
        fontSize: '0.875rem',
      }}
      role="status"
      aria-live="polite"
    >
      <span>Loading view...</span>
    </div>
  );
}

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
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/workspace" element={<Workspace />} />
          </Routes>
        </Suspense>
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
