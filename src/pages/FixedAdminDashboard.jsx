import React, { useState, useEffect } from 'react';

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
  const [navigate, setNavigate] = useState(null);

  useEffect(() => {
    // Import useNavigate dynamically to avoid import errors
    import('react-router-dom').then(({ useNavigate }) => {
      setNavigate(() => useNavigate());
    });
    
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
      
      if (navigate) {
        navigate('/login');
      }
      return;
    }
    
    // Load data based on active tab
    loadTabData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Effect to handle tab changes
  useEffect(() => {
    if (user && user.token) {
      loadTabData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const loadTabData = () => {
    if (activeTab === 'grievances') {
      fetchGrievances();
    } else if (activeTab === 'locations') {
      fetchAllWorkerLocations();
    } else if (activeTab === 'analytics') {
      fetchGrievances();
      fetchWorkers();
    }
  };

  const fetchWorkers = async () => {
    try {
      // Add verification for user and token
      if (!user || !user.token) {
        console.error('No auth token available for fetchWorkers');
        setError('Authentication error. Please login again.');
        return;
      }
      
      console.log('Fetching workers with token:', user.token);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/workers/all`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Workers API error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user'); // Clear invalid session
          if (navigate) navigate('/login');
          return;
        }
        
        throw new Error(`Failed to fetch workers: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Workers data fetched successfully:', data);
      setWorkers(data.workers || []);
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError('An error occurred while fetching workers: ' + err.message);
    }
  };

  const fetchGrievances = async () => {
    setLoading(true);
    try {
      // Check if user token exists
      if (!user || !user.token) {
        console.error('No auth token available for fetchGrievances');
        setError('Authentication error. Please login again.');
        localStorage.removeItem('user'); // Clear invalid session
        if (navigate) navigate('/login');
        return;
      }
      
      console.log('Fetching grievances with token:', user.token);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/admin`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Grievances API error:', response.status, errorText);
        
        // Handle unauthorized error
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user'); // Clear invalid session
          if (navigate) navigate('/login');
          return;
        }
        
        throw new Error(`Failed to load grievances: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Grievances data fetched successfully:', data);
      
      // Format the data to match our component's structure
      const formattedGrievances = data.grievances.map(g => ({
        id: g.grievance_id,
        title: g.description.substring(0, 30) + (g.description.length > 30 ? '...' : ''),
        category: g.category || 'General',
        status: g.status,
        assignment_status: g.assignment_details ? g.assignment_details.status : null,
        dateSubmitted: new Date(g.created_at).toISOString().split('T')[0],
        latitude: g.latitude,
        longitude: g.longitude,
        priority: g.priority || 'medium', // Default to medium if not specified
        citizenName: g.citizen ? g.citizen.full_name : 'Unknown',
        image_path: g.image_path,
        assigned_worker: g.assigned_worker,
        assignment_details: g.assignment_details
      }));
      
      setGrievances(formattedGrievances);
    } catch (err) {
      console.error('Error fetching grievances:', err);
      setError('Failed to load grievances: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllWorkerLocations = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Check if user token exists
      if (!user || !user.token) {
        console.error('No auth token available for fetchAllWorkerLocations');
        setError('Authentication error. Please login again.');
        return;
      }
      
      console.log('Fetching worker locations with token:', user.token);
      
      const timestamp = new Date().getTime();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/admin/worker-locations?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Worker locations API error:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user'); // Clear invalid session
          if (navigate) navigate('/login');
          return;
        }
        
        let errorMessage = 'Unknown error occurred';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.details || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(`Failed to fetch worker locations: ${response.status} - ${errorMessage}`);
      }
      
      const data = await response.json();
      console.log('Worker locations data fetched successfully:', data);
      
      const locationsArray = Array.isArray(data.locations) ? data.locations : [];
      setWorkerLocations(locationsArray);
      console.log('Worker locations fetched successfully:', locationsArray.length, 'records found');
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
    if (navigate) navigate('/login');
  };
  
  // The rest of the component would go here...
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>This is a placeholder. The rest of the dashboard would be rendered here.</p>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {loading && <div>Loading...</div>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default AdminDashboard;