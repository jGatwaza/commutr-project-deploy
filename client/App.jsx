import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CommuteProvider } from './context/CommuteContext';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChat from './components/FloatingChat';
import Login from './pages/Login';
import AgentMode from './pages/AgentMode';
import Home from './pages/Home';
import QuickPlaylist from './pages/QuickPlaylist';
import PlaylistView from './pages/PlaylistView';
import ImmersivePlayer from './pages/ImmersivePlayer';
import History from './pages/History';
import AchievementsPage from './pages/AchievementsPage';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleChatAction = (action) => {
    console.log('Chat action:', action);
    
    switch (action.type) {
      case 'skip_video':
        window.dispatchEvent(new CustomEvent('chat-skip-video'));
        break;
      case 'change_topic':
        window.dispatchEvent(new CustomEvent('chat-change-topic', { detail: action.topic }));
        break;
      case 'navigate':
        if (action.playlist && action.context) {
          navigate(action.path, { 
            state: { 
              playlist: action.playlist, 
              context: action.context 
            } 
          });
        } else {
          navigate(action.path);
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const showChat = location.pathname !== '/login';

  return (
    <>
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
      
      {showChat && <FloatingChat onAction={handleChatAction} />}
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
