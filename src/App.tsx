import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { Workspace } from './pages/Workspace';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';

export default function App() {
  return (
    <ErrorBoundary
      fallbackTitle="Application Render Failure"
      fallbackMessage="An unexpected rendering issue occurred in GitExplore. You can reload the application safely."
    >
      <NetworkStatusBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile/:username" element={<Profile />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
