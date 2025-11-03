import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CommuteProvider } from './context/CommuteContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AgentMode from './pages/AgentMode';
import Home from './pages/Home';
import QuickPlaylist from './pages/QuickPlaylist';
import PlaylistView from './pages/PlaylistView';
import ImmersivePlayer from './pages/ImmersivePlayer';

function App() {
  return (
    <AuthProvider>
      <CommuteProvider>
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
        <Route path="/" element={<Navigate to="/home" replace />} />
      </Routes>
      </CommuteProvider>
    </AuthProvider>
  );
}

export default App;
