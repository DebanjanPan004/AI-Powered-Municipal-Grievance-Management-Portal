import React from 'react';
import { useNavigate } from 'react-router-dom';
import FixedAnalyticsDashboard from '../components/FixedAnalyticsDashboard';

// Import the original AdminDashboard component
import OriginalAdminDashboard from './AdminDashboard';

const AdminDashboardFix = ({ user: propUser }) => {
  const navigate = useNavigate();
  
  return (
    <OriginalAdminDashboard 
      user={propUser} 
      AnalyticsDashboardComponent={FixedAnalyticsDashboard} 
    />
  );
};

export default AdminDashboardFix;