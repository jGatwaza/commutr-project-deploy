import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
// @ts-ignore: Vite handles extensionless import for JSX page
import Home from './pages/Home.jsx';
import { CreateCommuteWizard } from './flows/createWizard/index.js';
import PlaylistView from './pages/PlaylistView.jsx';

function App() {
  const [isAuthenticated] = useState(true); // Replace with your auth logic

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/create" 
            element={
              isAuthenticated ? (
                <CreateCommuteWizard />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          <Route
            path="/playlist"
            element={
              isAuthenticated ? (
                <PlaylistView />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          {/* Add other routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
