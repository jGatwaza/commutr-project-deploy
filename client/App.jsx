import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CommuteProvider } from './context/CommuteContext';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingChat from './components/FloatingChat';
import Login from './pages/Login';
import AgentMode from './pages/AgentMode';
import Home from './pages/Home';
import History from './pages/History';

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
          path="/history" 
          element={
            <ProtectedRoute>
              <History />
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
