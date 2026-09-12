import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

import { useWebOS } from './hooks/useWebOS';
import { useTVNavigation } from './hooks/useTVNavigation';

const Home = lazy(() => import('./pages/Home'));
const Watch = lazy(() => import('./pages/Watch'));
const MyList = lazy(() => import('./pages/MyList'));
const DeviceLoginPage = lazy(() => import('./pages/DeviceLoginPage'));
const MovieDetailPage = lazy(() => import('./pages/MovieDetailPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ActorPage = lazy(() => import('./pages/ActorPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function TVController() {
  useWebOS();
  useTVNavigation();
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <TVController />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/my-list" element={<MyList />} />
              <Route path="/phim/:slug" element={<MovieDetailPage />} />
              <Route path="/watch/:slug/:episode" element={<Watch />} />
              <Route path="/watch/:slug" element={<Watch />} />
              <Route path="/xem-phim/:slug/:episode" element={<Watch />} />
              <Route path="/xem-phim/:slug" element={<Watch />} />
              <Route path="/phim-le" element={<CatalogPage />} />
              <Route path="/phim-bo" element={<CatalogPage />} />
              <Route path="/hoat-hinh" element={<CatalogPage />} />
              <Route path="/tv-shows" element={<CatalogPage />} />
              <Route path="/danh-sach" element={<CatalogPage />} />
              <Route path="/the-loai/:slug" element={<CatalogPage />} />
              <Route path="/quoc-gia/:slug" element={<CatalogPage />} />
              <Route path="/dien-vien/:name" element={<ActorPage />} />
              <Route path="/dien-vien" element={<ActorPage />} />
              <Route path="/lich-chieu" element={<SchedulePage />} />
              <Route path="/device-login" element={<DeviceLoginPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
