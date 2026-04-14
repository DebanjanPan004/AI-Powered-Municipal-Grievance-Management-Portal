
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import LocationCapture from './pages/LocationCapture';
import SubmitGrievance from './pages/SubmitGrievance';
import LandingPage from './pages/LandingPage';

function App() {
  const [user, setUser] = useState(null);
  
  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);
  
  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
  
  // Protected route wrapper component
  const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      if (user.role === 'citizen') {
        return <Navigate to="/citizen/dashboard" />;
      } else if (user.role === 'municipal_admin') {
        return <Navigate to="/admin/dashboard" />;
      } else if (user.role === 'municipal_worker') {
        return <Navigate to="/worker/dashboard" />;
      }
    }
    
    return children;
  };

  return (
    <Router>
      <div style={{ 
        minHeight: '100vh',
        width: '100%',
        fontFamily: 'Poppins, sans-serif',
        background: '#fafafa',
        color: '#333'
      }}>
        <style data-jsx="true" data-global="true">{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          body {
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            width: 100%;
          }

          @media (max-width: 600px) {
            h2 {
              font-size: 1.8rem !important;
            }
            button {
              padding: 0.7rem 1.5rem !important;
              font-size: 1rem !important;
            }
          }
        `}</style>
        
        <Routes>
          {/* Public Routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route 
            path="/" 
            element={user ? (
              <Navigate to={`/${user.role === 'citizen' ? 'citizen' : user.role === 'municipal_admin' ? 'admin' : 'worker'}/dashboard`} />
            ) : (
              <LandingPage />
            )} 
          />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register setUser={setUser} />} />
          
          {/* Protected Citizen Routes */}
          <Route 
            path="/citizen/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <CitizenDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/citizen/submit-grievance" 
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <SubmitGrievance user={user} />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['municipal_admin']}>
                <AdminDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          
          {/* Protected Worker Routes */}
          <Route 
            path="/worker/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['municipal_worker']}>
                <WorkerDashboard user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/worker/location" 
            element={
              <ProtectedRoute allowedRoles={['municipal_worker']}>
                <LocationCapture user={user} />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
