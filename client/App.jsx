import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CommuteProvider } from './context/CommuteContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages for faster initial load
const Login = lazy(() => import('./pages/Login'));
const AgentMode = lazy(() => import('./pages/AgentMode'));
const ConversationMode = lazy(() => import('./pages/ConversationMode'));
const Home = lazy(() => import('./pages/Home'));
const QuickPlaylist = lazy(() => import('./pages/QuickPlaylist'));
const PlaylistView = lazy(() => import('./pages/PlaylistView'));
const ImmersivePlayer = lazy(() => import('./pages/ImmersivePlayer'));
const History = lazy(() => import('./pages/History'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '18px', color: '#468189' }}>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent"
          element={
            <ProtectedRoute>
              <AgentMode />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/conversation" 
          element={
            <ProtectedRoute>
              <ConversationMode />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create" 
          element={
            <ProtectedRoute>
              <QuickPlaylist />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/playlist"
          element={
            <ProtectedRoute>
              <PlaylistView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/player"
          element={
            <ProtectedRoute>
              <ImmersivePlayer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/achievements"
          element={
            <ProtectedRoute>
              <AchievementsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>

    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <CommuteProvider>
        <AppContent />
      </CommuteProvider>
    </AuthProvider>
  );
}

export default App;
