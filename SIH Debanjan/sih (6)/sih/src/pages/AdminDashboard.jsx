import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsDashboard from '../components/AnalyticsDashboard';

const AdminDashboard = ({ user: propUser }) => {
  // Get user from props or localStorage with more robust handling
  const [user, setUser] = useState(() => {
    // First try props
    if (propUser && propUser.token) {
      console.log('Using user from props:', propUser);
      return propUser;
    }
    
    // Then try localStorage
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (storedUser && storedUser.token) {
        console.log('Using user from localStorage:', storedUser);
        return storedUser;
      }
      
      console.error('No valid user in props or localStorage');
      return null;
    } catch (err) {
      console.error('Error parsing user from localStorage:', err);
      return null;
    }
  });
  
  const [activeTab, setActiveTab] = useState('grievances');
  const [grievances, setGrievances] = useState([]);
  const [workerLocations, setWorkerLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [workers, setWorkers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Load required fonts and icons
    const link1 = document.createElement('link');
    link1.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    link1.rel = 'stylesheet';
    document.head.appendChild(link1);

    const link2 = document.createElement('link');
    link2.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    link2.rel = 'stylesheet';
    document.head.appendChild(link2);

    // Check if we have a valid user with token
    if (!user || !user.token) {
      console.error('No valid user with token found');
      setError('Authentication error. Please login again.');
      
      // Try to get user again from localStorage before redirecting
      try {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (storedUser && storedUser.token) {
          console.log('Recovered user from localStorage:', storedUser);
          setUser(storedUser);
          return; // Don't navigate away if we found a valid user
        }
      } catch (err) {
        console.error('Failed to recover user from localStorage:', err);
      }
      
      navigate('/login');
      return;
    }
    
    // Load data based on active tab
    if (activeTab === 'grievances') {
      fetchGrievances();
    } else if (activeTab === 'locations') {
      fetchAllWorkerLocations();
    } else if (activeTab === 'analytics') {
      fetchGrievances();
      fetchWorkers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user, navigate]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/workers/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkers(data.workers || []);
      } else {
        console.error('Failed to fetch workers:', await response.text());
        setError('Failed to fetch workers. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError('An error occurred while fetching workers.');
    }
  };

  const fetchGrievances = async () => {
    setLoading(true);
    setError('');
    try {
      // Check if user token exists with more detailed logging
      if (!user || !user.token) {
        console.error('No auth token available for grievance fetch');
        setError('Authentication error. Please login again.');
        localStorage.removeItem('user'); // Clear invalid session
        navigate('/login');
        return;
      }
      
      console.log('Fetching grievances with token:', user.token.substring(0, 15) + '...');
      
      // Add cache-busting query parameter and additional headers
      const timestamp = new Date().getTime();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/admin?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Grievances response status:', response.status);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Non-JSON response received:', contentType);
          throw new Error('Invalid response format: expected JSON');
        }
        
        const data = await response.json();
        console.log('Grievances data received, count:', data.grievances?.length || 0);
        
        // Validate data structure
        if (!data.grievances || !Array.isArray(data.grievances)) {
          console.error('Invalid grievances data format:', data);
          throw new Error('Server returned invalid data format');
        }
        
        // Format the data to match our component's structure
        const formattedGrievances = data.grievances.map(g => ({
          id: g.grievance_id,
          title: g.description ? (g.description.substring(0, 30) + (g.description.length > 30 ? '...' : '')) : 'No description',
          category: g.category || 'General',
          status: g.status || 'pending',
          assignment_status: g.assignment_details ? g.assignment_details.status : null,
          dateSubmitted: g.created_at ? new Date(g.created_at).toISOString().split('T')[0] : 'Unknown date',
          latitude: g.latitude,
          longitude: g.longitude,
          priority: g.priority || 'medium', // Default to medium if not specified
          citizenName: g.citizen ? g.citizen.full_name : 'Unknown',
          image_path: g.image_path,
          assigned_worker: g.assigned_worker,
          assignment_details: g.assignment_details
        }));
        
        console.log('Grievances processed and state updated, count:', formattedGrievances.length);
        setGrievances(formattedGrievances);
        setError(''); // Clear any previous errors
      } else {
        // Enhanced error handling with detailed logging
        console.error('Failed to fetch grievances - HTTP status:', response.status);
        
        let errorMessage = 'Failed to load grievances. Please try again.';
        let errorCode = 'UNKNOWN_ERROR';
        
        try {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          
          // Try to parse as JSON for structured error
          try {
            const errorData = JSON.parse(errorText);
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
              errorCode = errorData.code || 'API_ERROR';
              console.error('Structured error:', errorData);
            }
          } catch (parseErr) {
            console.error('Could not parse error response as JSON:', parseErr);
            // Use text response as error message if it's not too long
            if (errorText && errorText.length < 100) {
              errorMessage = errorText;
            }
          }
        } catch (responseErr) {
          console.error('Error reading response body:', responseErr);
        }
        
        // Handle unauthorized error
        if (response.status === 401 || response.status === 403) {
          console.error('Authentication error, status:', response.status, 'code:', errorCode);
          errorMessage = 'Authentication error. Please login again.';
          
          // Try to refresh user from localStorage before logging out
          try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            if (storedUser && storedUser.token && storedUser.token !== user.token) {
              console.log('Found different token in localStorage, trying to recover session...');
              setUser(storedUser);
              return; // Will trigger a re-fetch with the new token
            }
          } catch (parseError) {
            console.error('Failed to parse localStorage user:', parseError);
          }
          
          localStorage.removeItem('user'); // Clear invalid session
          navigate('/login');
          return;
        }
        
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Error fetching grievances:', err);
      setError(`Failed to load grievances: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWorkerLocations = async () => {
    setLoading(true);
    setError('');
    
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/worker-locations?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Worker locations data:', data);
        
        const locationsArray = Array.isArray(data.locations) ? data.locations : [];
        setWorkerLocations(locationsArray);
        console.log('Worker locations fetched successfully:', locationsArray.length, 'records found');
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch worker locations:', errorText);
        
        let errorMessage = 'Unknown error occurred';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`Failed to fetch worker locations: ${response.status} - ${errorMessage}`);
      }
    } catch (err) {
      console.error('Error fetching worker locations:', err);
      setError('Failed to load worker locations: ' + (err.message || 'Unknown error'));
      setWorkerLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleImageClick = (imagePath) => {
    setSelectedImage(imagePath);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const getStatusBadge = (status, isAssignmentStatus = false) => {
    const statusStyles = {
      // Grievance statuses - Dark theme colors
      pending: { bg: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', border: 'rgba(255, 152, 0, 0.3)' },
      assigned: { bg: 'rgba(33, 150, 243, 0.2)', color: '#64b5f6', border: 'rgba(33, 150, 243, 0.3)' },
      working: { bg: 'rgba(0, 255, 135, 0.2)', color: '#00ff87', border: 'rgba(0, 255, 135, 0.3)' },
      in_progress: { bg: 'rgba(0, 255, 135, 0.2)', color: '#00ff87', border: 'rgba(0, 255, 135, 0.3)' },
      completed: { bg: 'rgba(76, 175, 80, 0.2)', color: '#81c784', border: 'rgba(76, 175, 80, 0.3)' },
      rejected: { bg: 'rgba(244, 67, 54, 0.2)', color: '#ff6b6b', border: 'rgba(244, 67, 54, 0.3)' },
      active: { bg: 'rgba(0, 255, 135, 0.2)', color: '#00ff87', border: 'rgba(0, 255, 135, 0.3)' },
      inactive: { bg: 'rgba(244, 67, 54, 0.2)', color: '#ff6b6b', border: 'rgba(244, 67, 54, 0.3)' },
      // Assignment statuses
      pending_acceptance: { bg: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', border: 'rgba(255, 152, 0, 0.3)' },
      accepted: { bg: 'rgba(33, 150, 243, 0.2)', color: '#64b5f6', border: 'rgba(33, 150, 243, 0.3)' }
    };
    
    if (!status) return <span style={{ color: '#a0a9b8', fontSize: '12px' }}>Not assigned</span>;
    
    const style = statusStyles[status] || statusStyles.pending;
    
    // Format display text
    let displayText = status;
    if (isAssignmentStatus) {
      // Format assignment status for better readability
      displayText = status === 'pending_acceptance' ? 'Pending' :
                    status === 'in_progress' ? 'Working' :
                    status.charAt(0).toUpperCase() + status.slice(1);
    } else {
      // Format grievance status for better readability
      displayText = status.charAt(0).toUpperCase() + status.slice(1);
      if (displayText === 'In_progress') displayText = 'In Progress';
    }
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '6px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {displayText}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityStyles = {
      high: { bg: 'rgba(244, 67, 54, 0.2)', color: '#ff6b6b', border: 'rgba(244, 67, 54, 0.3)' },
      medium: { bg: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', border: 'rgba(255, 152, 0, 0.3)' },
      low: { bg: 'rgba(33, 150, 243, 0.2)', color: '#64b5f6', border: 'rgba(33, 150, 243, 0.3)' }
    };
    
    const style = priorityStyles[priority] || priorityStyles.medium;
    
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: '6px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {priority}
      </span>
    );
  };

  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const handleAssignTask = async (grievanceId) => {
    try {
      setSelectedGrievance(grievanceId);
      setAssignLoading(true);
      
      // Find the grievance to get its coordinates
      const selectedGrievanceObj = grievances.find(g => g.id === grievanceId || g.grievance_id === grievanceId);
      if (!selectedGrievanceObj) {
        throw new Error('Grievance not found');
      }
      
      // Fetch available workers for this grievance with coordinates for proximity sorting
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/workers/available?latitude=${selectedGrievanceObj.latitude}&longitude=${selectedGrievanceObj.longitude}`, 
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableWorkers(data.workers || []);
        setAssignModalOpen(true);
      } else {
        console.error('Failed to fetch available workers:', await response.text());
        setError('Failed to fetch available workers. Please try again.');
      }
    } catch (err) {
      console.error('Error preparing assignment:', err);
      setError('An error occurred while preparing the assignment.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Helper function to make the actual assignment API call
  const assignGrievanceToWorker = async (grievanceId, workerId, token) => {
    if (!token) {
      throw new Error('No authentication token provided to assignGrievanceToWorker');
    }
    
    console.log('Using token for request:', token);
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        grievanceId: parseInt(grievanceId), // Ensure it's a number
        workerId: parseInt(workerId) // Ensure it's a number
      })
    });
    
    const responseData = await response.json();
      
    if (response.ok) {
      // Show success message
      alert('Task successfully assigned to worker!');
      
      // Refresh grievances list
      fetchGrievances();
      setAssignModalOpen(false);
      setSelectedGrievance(null);
    } else {
      console.error('Assignment failed:', responseData);
      setError(responseData.error || responseData.details || 'Failed to assign task.');
    }
    
    return response;
  };

  const handleAssignWorker = async (workerId) => {
    if (!selectedGrievance || !workerId) return;
    
    try {
      setAssignLoading(true);
      
      // Debug the user and token
      console.log('User object:', user);
      console.log('User token:', user?.token);
      
      // Verify we have a valid token
      if (!user || !user.token) {
        console.error('No auth token available');
        
        // Try to get fresh token from localStorage
        try {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser && storedUser.token) {
            console.log('Recovered user from localStorage for assignment:', storedUser);
            setUser(storedUser);
            // Continue with the assignment using the recovered token
            await assignGrievanceToWorker(selectedGrievance, workerId, storedUser.token);
            return;
          }
        } catch (err) {
          console.error('Failed to recover user from localStorage:', err);
        }
        
        setError('Authentication error. Please login again.');
        setTimeout(() => navigate('/login'), 2000); // Redirect after showing error
        return;
      }
      
      // Debug the value types
      console.log('Assigning grievance to worker:', { 
        grievanceId: selectedGrievance,
        grievanceIdType: typeof selectedGrievance,
        workerId: workerId,
        workerIdType: typeof workerId
      });
      
      await assignGrievanceToWorker(selectedGrievance, workerId, user.token);
      
    } catch (err) {
      console.error('Error assigning task:', err);
      setError('An error occurred while assigning the task.');
    } finally {
      setAssignLoading(false);
    }
  };

  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  
  // Handler for opening map modal with location
  const handleViewOnMap = async (latitude, longitude, title) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    setSelectedLocation({
      latitude: lat,
      longitude: lng,
      title: title || 'Grievance Location'
    });
    setLocationName('Loading location...');
    setMapModalOpen(true);

    // Get readable address from coordinates using reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setLocationName(address);
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      setLocationName(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };
  
  // Handler for closing map modal
  const closeMapModal = () => {
    setMapModalOpen(false);
    setSelectedLocation(null);
    setLocationName('');
  };
  
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1f 100%)',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <i className="fas fa-shield-alt" style={{ 
            fontSize: '32px', 
            color: '#00ff87', 
            marginRight: '16px' 
          }}></i>
          <h1 style={{ 
            margin: 0, 
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #00ff87, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Admin Dashboard
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: '20px', textAlign: 'right' }}>
            <p style={{ margin: '0', color: '#ffffff', fontWeight: '600', fontSize: '16px' }}>
              <i className="fas fa-user-shield" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              {user.name}
            </p>
            <p style={{ margin: '0', color: '#a0a9b8', fontSize: '14px' }}>
              Municipal Admin
            </p>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #00ff87, #00d96f)',
              color: '#0a0b0d',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </header>
      
      {/* Tabs */}
      <div style={{ 
        padding: '30px 30px 0',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%'
      }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
          marginBottom: '30px'
        }}>
          <button
            onClick={() => setActiveTab('grievances')}
            style={{
              padding: '16px 32px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'grievances' ? '3px solid #00ff87' : 'none',
              fontWeight: activeTab === 'grievances' ? '700' : '500',
              color: activeTab === 'grievances' ? '#00ff87' : '#a0a9b8',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '16px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'grievances') {
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'grievances') {
                e.target.style.color = '#a0a9b8';
              }
            }}
          >
            <i className="fas fa-list-alt"></i>
            Grievances
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            style={{
              padding: '16px 32px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'locations' ? '3px solid #00ff87' : 'none',
              fontWeight: activeTab === 'locations' ? '700' : '500',
              color: activeTab === 'locations' ? '#00ff87' : '#a0a9b8',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '16px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'locations') {
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'locations') {
                e.target.style.color = '#a0a9b8';
              }
            }}
          >
            <i className="fas fa-map-marker-alt"></i>
            All Location Records
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '16px 32px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'analytics' ? '3px solid #00ff87' : 'none',
              fontWeight: activeTab === 'analytics' ? '700' : '500',
              color: activeTab === 'analytics' ? '#00ff87' : '#a0a9b8',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'analytics') {
                e.target.style.color = '#ffffff';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'analytics') {
                e.target.style.color = '#a0a9b8';
              }
            }}
          >
            <i className="fas fa-chart-bar"></i>
            Analytics Dashboard
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <main style={{ padding: '30px', flex: 1 }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          
          {error && (
            <div style={{ 
              padding: '16px 20px', 
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-exclamation-triangle" style={{ color: '#ff6b6b' }}></i>
              <span style={{ color: '#ff6b6b', fontWeight: '500' }}>{error}</span>
              <button 
                onClick={() => setError('')} 
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff6b6b',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(244, 67, 54, 0.2)'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          {/* Grievances Tab Content */}
          {activeTab === 'grievances' && (
            <>
              <h2 style={{ 
                margin: '0 0 24px 0', 
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fas fa-list-alt" style={{ color: '#00ff87' }}></i>
                All Grievances
              </h2>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <i className="fas fa-spinner fa-spin" style={{ 
                    fontSize: '32px', 
                    color: '#00ff87', 
                    marginBottom: '16px' 
                  }}></i>
                  <p style={{ color: '#a0a9b8', fontSize: '16px' }}>Loading grievances...</p>
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '15px',
                  overflow: 'auto',
                  border: '1px solid rgba(0, 255, 135, 0.2)',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
                }}>
                  {/* Table Header */}
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 80px 80px',
                    padding: '20px',
                    background: 'rgba(0, 255, 135, 0.1)',
                    borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
                    fontWeight: '600',
                    color: '#00ff87',
                    fontSize: '14px'
                  }}>
                    <div><i className="fas fa-hashtag"></i></div>
                    <div><i className="fas fa-image"></i></div>
                    <div><i className="fas fa-file-alt"></i> Title</div>
                    <div><i className="fas fa-tag"></i> Category</div>
                    <div><i className="fas fa-info-circle"></i> Status</div>
                    <div><i className="fas fa-user-cog"></i> Assignment</div>
                    <div><i className="fas fa-user"></i> Submitter</div>
                    <div><i className="fas fa-calendar"></i> Date</div>
                    <div><i className="fas fa-map-marker-alt"></i> Location</div>
                    <div><i className="fas fa-map"></i></div>
                    <div><i className="fas fa-cog"></i></div>
                  </div>
                  
                  {/* Table Body */}
                  {grievances.map((grievance) => (
                    <div 
                      key={grievance.id}
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 80px 80px',
                        padding: '20px',
                        borderBottom: '1px solid rgba(0, 255, 135, 0.1)',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        color: '#ffffff',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 135, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 135, 0.3)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(0, 255, 135, 0.1)';
                      }}
                    >
                      <div style={{ color: '#00ff87', fontWeight: '600' }}>{grievance.id}</div>
                      <div>
                        {grievance.image_path ? (
                          <img 
                            src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${grievance.image_path}`}
                            alt="Grievance"
                            style={{
                              width: '60px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #ddd',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleImageClick(`${import.meta.env.VITE_API_URL.replace('/api', '')}${grievance.image_path}`)}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                        ) : null}
                        <span style={{ display: 'none', fontSize: '12px', color: '#a0a9b8' }}>No image</span>
                      </div>
                      <div style={{ fontWeight: '500', color: '#ffffff' }}>{grievance.title}</div>
                      <div style={{ color: '#a0a9b8' }}>{grievance.category}</div>
                      <div>{getStatusBadge(grievance.status)}</div>
                      <div>{getStatusBadge(grievance.assignment_status, true)}</div>
                      <div style={{ color: '#a0a9b8' }}>{grievance.citizenName}</div>
                      <div style={{ color: '#a0a9b8' }}>{grievance.dateSubmitted}</div>
                      <div style={{ fontSize: '12px', color: '#a0a9b8' }}>
                        {grievance.latitude !== undefined && grievance.longitude !== undefined ? 
                          `${typeof grievance.latitude === 'number' ? grievance.latitude.toFixed(6) : parseFloat(grievance.latitude).toFixed(6)}, 
                           ${typeof grievance.longitude === 'number' ? grievance.longitude.toFixed(6) : parseFloat(grievance.longitude).toFixed(6)}` 
                          : 'No coordinates'
                        }
                      </div>
                      <div>
                        {grievance.latitude !== undefined && grievance.longitude !== undefined && (
                          <button
                            onClick={() => handleViewOnMap(grievance.latitude, grievance.longitude, grievance.title)}
                            style={{
                              padding: '6px 12px',
                              background: 'linear-gradient(135deg, #2196f3, #1976d2)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <i className="fas fa-map-marker-alt"></i>
                            View
                          </button>
                        )}
                      </div>
                      <div>
                        {grievance.status === 'pending' && (
                          <button
                            onClick={() => handleAssignTask(grievance.id)}
                            style={{
                              padding: '8px 16px',
                              background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                              color: '#0a0b0d',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <i className="fas fa-user-plus" style={{ marginRight: '4px' }}></i>
                            Assign
                          </button>
                        )}
                        {grievance.status === 'assigned' && grievance.assigned_worker && (
                          <div style={{ fontSize: '12px', color: '#a0a9b8' }}>
                            <div>Assigned to:</div>
                            <div style={{ fontWeight: '600', color: '#00ff87' }}>
                              {grievance.assigned_worker.full_name}
                            </div>
                          </div>
                        )}
                        {(grievance.status === 'working' || grievance.status === 'completed') && (
                          <div style={{ fontSize: '12px', color: '#a0a9b8' }}>
                            <div>{grievance.status === 'working' ? 'In Progress' : 'Completed'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          
          {/* All Location Records Tab Content */}
          {activeTab === 'locations' && (
            <>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{ 
                  margin: '0', 
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#00ff87' }}></i>
                  All Worker Location Records
                </h2>
                <button
                  onClick={fetchAllWorkerLocations}
                  disabled={loading}
                  style={{
                    padding: '12px 20px',
                    background: loading ? 'rgba(0, 255, 135, 0.3)' : 'linear-gradient(135deg, #00ff87, #00d96f)',
                    color: loading ? '#a0a9b8' : '#0a0b0d',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  <span style={{ 
                    display: 'inline-block',
                    width: '14px',
                    height: '14px'
                  }}>
                    {loading ? '⟳' : <i className="fas fa-sync-alt"></i>}
                  </span>
                  Refresh Records
                </button>
              </div>
              
              {/* Location Records Statistics */}
              {!loading && workerLocations.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: '#00ff87',
                      marginBottom: '4px'
                    }}>
                      {workerLocations.length}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#a0a9b8',
                      fontWeight: '500'
                    }}>
                      Total Location Records
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: '#64b5f6',
                      marginBottom: '4px'
                    }}>
                      {new Set(workerLocations.map(l => l.worker_id)).size}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#a0a9b8',
                      fontWeight: '500'
                    }}>
                      Unique Workers
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      fontSize: '28px', 
                      fontWeight: '700', 
                      color: '#ffb74d',
                      marginBottom: '4px'
                    }}>
                      {workerLocations.filter(l => 
                        new Date(l.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
                      ).length}
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#a0a9b8',
                      fontWeight: '500'
                    }}>
                      Last 24 Hours
                    </div>
                  </div>
                </div>
              )}
              
              {loading ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 0',
                  color: '#a0a9b8'
                }}>
                  <i className="fas fa-spinner fa-spin" style={{ 
                    fontSize: '32px', 
                    color: '#00ff87',
                    marginBottom: '16px'
                  }}></i>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: '500' }}>
                    Loading location records...
                  </p>
                </div>
              ) : (
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '100%'
                }}>
                  {/* Table Header */}
                  <div style={{ 
                    display: 'flex',
                    width: '100%',
                    padding: '20px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
                    fontWeight: '700',
                    color: '#ffffff',
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px'
                  }}>
                    <div style={{ flex: '0 0 120px', textAlign: 'center', paddingRight: '15px' }}>Location ID</div>
                    <div style={{ flex: '0 0 120px', textAlign: 'center', paddingRight: '15px' }}>Worker ID</div>
                    <div style={{ flex: '0 0 160px', textAlign: 'center', paddingRight: '15px' }}>Latitude</div>
                    <div style={{ flex: '0 0 160px', textAlign: 'center', paddingRight: '15px' }}>Longitude</div>
                    <div style={{ flex: '1', textAlign: 'center' }}>Timestamp</div>
                  </div>
                  
                  {/* Table Body */}
                  {workerLocations.length > 0 ? workerLocations.map((location, index) => (
                    <div 
                      key={location.location_id}
                      style={{ 
                        display: 'flex',
                        width: '100%',
                        padding: '18px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        alignItems: 'center',
                        transition: 'all 0.3s ease',
                        color: '#ffffff',
                        background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                        fontSize: '14px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 135, 0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.2)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        flex: '0 0 120px',
                        fontWeight: '600', 
                        textAlign: 'center',
                        color: '#00ff87',
                        fontSize: '15px',
                        paddingRight: '15px'
                      }}>
                        {location.location_id}
                      </div>
                      <div style={{ 
                        flex: '0 0 120px',
                        textAlign: 'center',
                        fontWeight: '500',
                        color: '#64b5f6',
                        paddingRight: '15px'
                      }}>
                        {location.worker_id}
                      </div>
                      <div style={{ 
                        flex: '0 0 160px',
                        fontFamily: '"JetBrains Mono", "Consolas", monospace', 
                        fontSize: '13px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        color: '#ffb74d',
                        marginRight: '15px',
                        border: '1px solid rgba(255, 183, 77, 0.2)'
                      }}>
                        {parseFloat(location.latitude).toFixed(6)}
                      </div>
                      <div style={{ 
                        flex: '0 0 160px',
                        fontFamily: '"JetBrains Mono", "Consolas", monospace', 
                        fontSize: '13px',
                        textAlign: 'center',
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        color: '#ffb74d',
                        marginRight: '15px',
                        border: '1px solid rgba(255, 183, 77, 0.2)'
                      }}>
                        {parseFloat(location.longitude).toFixed(6)}
                      </div>
                      <div style={{ 
                        flex: '1',
                        textAlign: 'center',
                        fontSize: '13px',
                        color: '#a0a9b8',
                        fontWeight: '500',
                        lineHeight: '1.4'
                      }}>
                        <div style={{ color: '#00ff87', fontWeight: '600', marginBottom: '2px' }}>
                          {new Date(location.timestamp).toLocaleDateString()}
                        </div>
                        <div style={{ color: '#a0a9b8', fontSize: '12px' }}>
                          {new Date(location.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div style={{
                      padding: '60px 20px',
                      textAlign: 'center',
                      color: '#a0a9b8',
                      fontSize: '16px',
                      fontWeight: '500',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      margin: '20px'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
                      <div style={{ marginBottom: '8px', color: '#ffffff' }}>No location records found</div>
                      <div style={{ fontSize: '14px', color: '#a0a9b8' }}>
                        Worker location data will appear here once available
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Analytics Dashboard Tab Content */}
          {activeTab === 'analytics' && (
            <AnalyticsDashboard 
              user={user} 
              grievances={grievances} 
              workers={workers} 
              onAssignTask={handleAssignTask}
            />
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{ 
        padding: '24px',
        textAlign: 'center',
        color: '#a0a9b8',
        borderTop: '1px solid rgba(0, 255, 135, 0.1)',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ 
          margin: '0',
          fontFamily: '"Inter", sans-serif',
          fontSize: '14px',
          fontWeight: '400'
        }}>
          © 2023 Municipal Grievance Portal. All rights reserved.
        </p>
      </footer>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            cursor: 'pointer'
          }}
          onClick={closeImageModal}
        >
          <div style={{ position: 'relative' }}>
            <img 
              src={selectedImage}
              alt="Full size grievance"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '2px solid rgba(0, 255, 135, 0.3)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
              }}
            />
            <button
              onClick={closeImageModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
      
      {/* Map Modal */}
      {mapModalOpen && selectedLocation && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(10, 11, 13, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 135, 0.2)',
            width: '90%',
            maxWidth: '800px',
            height: '80vh',
            maxHeight: '800px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '20px',
                color: '#ffffff',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fas fa-map-marker-alt" style={{ color: '#00ff87' }}></i>
                {selectedLocation.title} - Location Map
              </h2>
              <button
                onClick={closeMapModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div style={{ padding: '20px 24px', marginBottom: '10px' }}>
              {/* Location Address */}
              <div style={{
                background: 'rgba(0, 255, 135, 0.05)',
                borderRadius: '12px',
                padding: '15px 20px',
                marginBottom: '16px',
                border: '1px solid rgba(0, 255, 135, 0.2)'
              }}>
                <h4 style={{
                  margin: '0 0 10px 0',
                  color: '#00ff87',
                  fontSize: '16px',
                  fontWeight: '600'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ marginRight: '8px' }}></i>
                  Location Address
                </h4>
                <p style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {locationName}
                </p>
              </div>
              
              {/* Coordinates */}
              <div style={{ 
                display: 'flex',
                gap: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: '600', color: '#00ff87' }}>Coordinates:</div>
                <div style={{ 
                  fontFamily: '"JetBrains Mono", "Consolas", monospace', 
                  color: '#ffb74d',
                  background: 'rgba(255, 183, 77, 0.1)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 183, 77, 0.2)'
                }}>
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </div>
              </div>
            </div>
            
            <div id="mapContainer" style={{ 
              flex: 1,
              overflow: 'hidden',
              backgroundColor: '#f0f0f0',
              position: 'relative'
            }}>
              <div style={{ 
                width: '100%', 
                height: '100%', 
                border: '1px solid #ccc',
                position: 'relative'
              }}>
                {/* OpenStreetMap iframe with enhanced red marker */}
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <iframe
                    title="Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.longitude - 0.01}%2C${selectedLocation.latitude - 0.01}%2C${selectedLocation.longitude + 0.01}%2C${selectedLocation.latitude + 0.01}&layer=mapnik&marker=${selectedLocation.latitude}%2C${selectedLocation.longitude}`}
                    style={{ border: 'none' }}
                  ></iframe>
                  
                  {/* Custom prominent red marker overlay */}
                  <div id="customMarker" ref={el => {
                    // Wait for iframe to load then add custom marker
                    setTimeout(() => {
                      if (el) {
                        // Position the marker at the center of the map
                        el.style.position = 'absolute';
                        el.style.left = '50%';
                        el.style.top = '50%';
                        el.style.transform = 'translate(-50%, -50%)';
                        el.style.zIndex = '1000';
                      }
                    }, 1000); // Delay to ensure map is loaded
                  }} style={{
                    width: '24px',
                    height: '36px',
                    background: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 36\'><path fill=\'%23FF0000\' d=\'M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24c0-6.6-5.4-12-12-12zm0 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z\'/></svg>")',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    pointerEvents: 'none' // Don't interfere with map interactions
                  }}>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                position: 'absolute', 
                bottom: '10px', 
                right: '10px',
                backgroundColor: 'white',
                padding: '5px 10px',
                borderRadius: '5px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                fontSize: '12px',
                color: '#555'
              }}>
                <a 
                  href={`https://www.openstreetmap.org/?mlat=${selectedLocation.latitude}&mlon=${selectedLocation.longitude}#map=17/${selectedLocation.latitude}/${selectedLocation.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#0078d7', textDecoration: 'none' }}
                >
                  View on OpenStreetMap
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Worker Assignment Modal */}
      {assignModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '20px',
            boxShadow: '0 5px 20px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            <h2 style={{ marginTop: 0, color: '#333' }}>Assign Task to Worker</h2>
            <p style={{ color: '#666' }}>
              Showing workers sorted by proximity to grievance location
            </p>
            
            {availableWorkers.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {availableWorkers.map(worker => (
                  <div 
                    key={worker.user_id}
                    style={{
                      padding: '15px',
                      borderBottom: '1px solid #eee',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '16px' }}>{worker.full_name}</div>
                      <div style={{ color: '#777', fontSize: '14px' }}>ID: {worker.worker_id} | Name: {worker.full_name}</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        {worker.distance !== null ? (
                          <span style={{ 
                            backgroundColor: '#e6f7ff', 
                            color: '#0078d7',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            {worker.distance} km away
                          </span>
                        ) : (
                          <span style={{ 
                            backgroundColor: '#ffe6e6', 
                            color: '#d70000',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '12px'
                          }}>
                            Location unknown
                          </span>
                        )}
                        <span style={{ 
                          backgroundColor: worker.current_tasks > 0 ? '#fff2e6' : '#e6ffe6',
                          color: worker.current_tasks > 0 ? '#d77b00' : '#00a651',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}>
                          {worker.current_tasks} active tasks
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignWorker(worker.user_id)}
                      style={{
                        background: '#0078d7',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#777' }}>No available workers found</p>
            )}
            
            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => setAssignModalOpen(false)}
                style={{
                  background: '#f1f1f1',
                  color: '#333',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
