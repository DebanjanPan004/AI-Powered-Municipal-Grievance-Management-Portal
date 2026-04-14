import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const CitizenDashboard = ({ user }) => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [locationModal, setLocationModal] = useState(null);
  const [map, setMap] = useState(null);
  const [locationName, setLocationName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Helper function to properly construct image URLs
  const constructImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    // If the path already includes the full URL, return it as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // If path already starts with /uploads, prepend the base URL
    if (imagePath.startsWith('/uploads/')) {
      return `${import.meta.env.VITE_API_URL.replace('/api', '')}${imagePath}`;
    }
    
    // If path is just a filename, construct the full path
    if (!imagePath.includes('/')) {
      return `${import.meta.env.VITE_API_URL.replace('/api', '')}/uploads/${imagePath}`;
    }
    
    // Default case: prepend base URL
    return `${import.meta.env.VITE_API_URL.replace('/api', '')}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
  };
  
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

    // Load Leaflet CSS for map functionality
    const leafletCSS = document.createElement('link');
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    leafletCSS.rel = 'stylesheet';
    leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    leafletCSS.crossOrigin = '';
    document.head.appendChild(leafletCSS);

    // Load Leaflet JS for map functionality
    const leafletJS = document.createElement('script');
    leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletJS.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    leafletJS.crossOrigin = '';
    document.head.appendChild(leafletJS);

    // Fetch citizen's grievances - would be an API call in a real app
    fetchGrievances();
    
    // Check for notifications in the location state
    if (location.state && location.state.grievanceSubmitted) {
      alert(location.state.message);
      // Clear the location state to avoid showing the message again on refresh
      window.history.replaceState({}, document.title);
    }
  }, []);
  
  const fetchGrievances = async () => {
    try {
      // Check if user token exists
      if (!user || !user.token) {
        console.error('No auth token available');
        setError('Authentication error. Please login again.');
        localStorage.removeItem('user'); // Clear invalid session
        navigate('/login');
        return;
      }
      
      console.log('Fetching grievances for citizen with token:', user.token);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/citizen`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Grievances data received:', data);
        
        // Determine the structure of the response
        let grievancesToProcess = [];
        
        // Handle different possible response formats
        if (data.grievances && Array.isArray(data.grievances)) {
          // Expected format: { grievances: [...] }
          grievancesToProcess = data.grievances;
          console.log('Standard format detected');
        } else if (Array.isArray(data)) {
          // Alternative format: direct array
          grievancesToProcess = data;
          console.log('Direct array format detected');
        } else if (typeof data === 'object' && data !== null) {
          // Try to find an array property in the response
          const arrayProps = Object.keys(data).filter(key => Array.isArray(data[key]));
          if (arrayProps.length > 0) {
            grievancesToProcess = data[arrayProps[0]];
            console.log(`Found array in property: ${arrayProps[0]}`);
          } else {
            console.error('Could not find any array in the response:', data);
            setError('Received unexpected data format from server');
            setLoading(false);
            return;
          }
        } else {
          console.error('Completely unexpected data format:', data);
          setError('Received invalid data format from server');
          setLoading(false);
          return;
        }
        
        console.log(`Found ${grievancesToProcess.length} grievances to process`);
        
        // Format the data to match our component's structure with safeguards
        const formattedGrievances = grievancesToProcess.map(g => {
          // Handle missing properties with defaults
          const grievance = {
            id: g.grievance_id || g.id || 'Unknown',
            title: g.description ? 
              g.description.substring(0, 30) + (g.description.length > 30 ? '...' : '') : 
              g.title || 'No description',
            category: g.category || 'General',
            status: g.status || 'pending',
            dateSubmitted: g.created_at ? 
              new Date(g.created_at).toISOString().split('T')[0] : 
              new Date().toISOString().split('T')[0],
            latitude: g.latitude || null,
            longitude: g.longitude || null,
            image_path: g.image_path || null
          };
          return grievance;
        });
        
        console.log('Formatted grievances:', formattedGrievances);
        setGrievances(formattedGrievances);
        setLoading(false);
      } else {
        let errorText;
        try {
          // Try to parse as JSON first
          const errorData = await response.json();
          errorText = JSON.stringify(errorData);
          console.error('Failed to fetch grievances:', errorData);
        } catch (e) {
          // If it's not JSON, get as text
          errorText = await response.text();
          console.error('Failed to fetch grievances (text):', errorText);
        }
        
        // Handle unauthorized error
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user'); // Clear invalid session
          navigate('/login');
          return;
        }
        
        setError(`Failed to load grievances (${response.status}): ${errorText}`);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching grievances:', err);
      setError('Failed to connect to the server. Please check your connection and try again.');
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

  // Function to handle grievance location click
  const handleLocationClick = async (grievance) => {
    if (!grievance.latitude || !grievance.longitude) {
      alert('No location data available for this grievance.');
      return;
    }

    // Convert coordinates to numbers if they're strings
    const lat = typeof grievance.latitude === 'number' ? grievance.latitude : parseFloat(grievance.latitude);
    const lng = typeof grievance.longitude === 'number' ? grievance.longitude : parseFloat(grievance.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      alert('Invalid location coordinates.');
      return;
    }

    setLocationModal(grievance);
    setLocationName('Loading location...');

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

    // Initialize map after modal opens
    setTimeout(() => initializeLocationMap(grievance), 200);
  };

  // Function to initialize location map
  const initializeLocationMap = (grievance) => {
    if (typeof window.L === 'undefined') {
      setTimeout(() => initializeLocationMap(grievance), 100);
      return;
    }

    const mapContainer = document.getElementById('location-modal-map');
    if (!mapContainer) return;

    // Convert coordinates to numbers if they're strings
    const lat = typeof grievance.latitude === 'number' ? grievance.latitude : parseFloat(grievance.latitude);
    const lng = typeof grievance.longitude === 'number' ? grievance.longitude : parseFloat(grievance.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      console.error('Invalid coordinates for map initialization');
      return;
    }

    // Clear existing map if any
    if (map) {
      map.remove();
    }

    // Create map centered on the grievance location
    const newMap = window.L.map('location-modal-map').setView([lat, lng], 15);
    
    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    // Create custom marker icon
    const customIcon = window.L.divIcon({
      className: 'custom-location-marker',
      html: '<i class="fas fa-map-marker-alt" style="color: #ff4444; font-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));"></i>',
      iconSize: [32, 32],
      iconAnchor: [16, 32]
    });

    // Add marker at the grievance location
    const marker = window.L.marker([lat, lng], { 
      icon: customIcon
    }).addTo(newMap);

    // Add popup with grievance information
    marker.bindPopup(`
      <div style="color: #333; font-size: 14px; max-width: 250px;">
        <strong>Grievance Location:</strong><br/>
        ${grievance.title || `${grievance.category} Issue`}<br/>
        <small>${locationName}</small>
      </div>
    `).openPopup();

    setMap(newMap);
  };

  // Function to close location modal
  const closeLocationModal = () => {
    if (map) {
      map.remove();
      setMap(null);
    }
    setLocationModal(null);
    setLocationName('');
  };
  
  const getStatusBadge = (status) => {
    const statusStyles = {
      pending: { bg: '#FFF3CD', color: '#856404' },
      assigned: { bg: '#D1ECF1', color: '#0C5460' },
      in_progress: { bg: '#D4EDDA', color: '#155724' },
      resolved: { bg: '#C3E6CB', color: '#155724' },
      rejected: { bg: '#F8D7DA', color: '#721C24' }
    };
    
    const style = statusStyles[status] || statusStyles.pending;
    
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1f 100%)',
      fontFamily: 'Inter, sans-serif',
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
            fontSize: '28px', 
            color: '#00ff87', 
            marginRight: '12px' 
          }}></i>
          <h1 style={{ 
            margin: 0, 
            color: '#ffffff',
            fontSize: '28px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #00ff87, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Municipal Reporter
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: '20px', textAlign: 'right' }}>
            <p style={{ margin: '0', color: '#ffffff', fontWeight: '600', fontSize: '16px' }}>
              <i className="fas fa-user" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              {user.name}
            </p>
            <p style={{ margin: '0', color: '#a0a9b8', fontSize: '14px' }}>
              Citizen Dashboard
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
      
      {/* Main Content */}
      <main style={{ padding: '40px 30px' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          alignItems: 'start'
        }}>
          {/* Submit New Report Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(0, 255, 135, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '30px' 
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <i className="fas fa-plus" style={{ fontSize: '20px', color: '#0a0b0d' }}></i>
              </div>
              <h2 style={{ 
                margin: '0', 
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: '700'
              }}>
                Submit New Report
              </h2>
            </div>

            {/* Link to the Submit Grievance Page (preserves original functionality) */}
            <Link 
              to="/citizen/submit-grievance"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                color: '#0a0b0d',
                borderRadius: '15px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '18px',
                gap: '12px',
                marginTop: '24px',
                transition: 'all 0.3s ease',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 15px 35px rgba(0, 255, 135, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-file-alt" style={{ fontSize: '20px' }}></i>
              Submit New Grievance
            </Link>
          </div>

          {/* My Reports Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(0, 255, 135, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              marginBottom: '30px' 
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                borderRadius: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '16px'
              }}>
                <i className="fas fa-list-alt" style={{ fontSize: '20px', color: '#0a0b0d' }}></i>
              </div>
              <h2 style={{ 
                margin: '0', 
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: '700'
              }}>
                My Reports
              </h2>
            </div>

            {error ? (
              <div style={{ 
                padding: '24px',
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: '15px',
                marginBottom: '24px',
                textAlign: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ 
                  fontSize: '24px', 
                  color: '#ff6b6b', 
                  marginBottom: '12px' 
                }}></i>
                <p style={{ color: '#ff6b6b', marginBottom: '20px', fontWeight: '500' }}>
                  {error}
                </p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    fetchGrievances();
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                    color: '#0a0b0d',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '14px',
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
                  <i className="fas fa-redo" style={{ marginRight: '8px' }}></i>
                  Try Again
                </button>
              </div>
            ) : loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <i className="fas fa-spinner fa-spin" style={{ 
                  fontSize: '32px', 
                  color: '#00ff87', 
                  marginBottom: '16px' 
                }}></i>
                <p style={{ color: '#a0a9b8', fontSize: '16px' }}>Loading grievances...</p>
              </div>
            ) : grievances.length > 0 ? (
              <div>
                {/* Show only first 3 grievances as preview */}
                {grievances.slice(0, 3).map((grievance, index) => (
                  <div 
                    key={grievance.id}
                    style={{
                      padding: '20px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(0, 255, 135, 0.1)',
                      borderRadius: '15px',
                      marginBottom: '16px',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.3)';
                      e.target.style.boxShadow = '0 10px 30px rgba(0, 255, 135, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.1)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#00ff87' 
                        }}>
                          <i className="fas fa-hashtag" style={{ marginRight: '4px' }}></i>
                          RPT-{String(grievance.id).padStart(3, '0')}
                        </span>
                        {/* Use actual category from the data */}
                        <span style={{
                          marginLeft: '12px',
                          padding: '4px 12px',
                          background: grievance.category === 'Road' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                          color: grievance.category === 'Road' ? '#ff6b6b' : '#ffb74d',
                          border: `1px solid ${grievance.category === 'Road' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {grievance.category === 'Road' ? 'HIGH' : 'MEDIUM'}
                        </span>
                      </div>
                      <div>
                        {/* Use actual status from the data */}
                        <span style={{
                          padding: '6px 16px',
                          background: 
                            grievance.status === 'resolved' ? 'linear-gradient(135deg, #4caf50, #45a049)' : 
                            grievance.status === 'rejected' ? 'linear-gradient(135deg, #f44336, #d32f2f)' : 
                            grievance.status === 'in_progress' ? 'linear-gradient(135deg, #2196f3, #1976d2)' :
                            grievance.status === 'assigned' ? 'linear-gradient(135deg, #ff9800, #f57c00)' :
                            'linear-gradient(135deg, #9e9e9e, #757575)',
                          color: 'white',
                          borderRadius: '15px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {grievance.status === 'in_progress' ? 'In Progress' : 
                           grievance.status === 'resolved' ? 'Resolved' : 
                           grievance.status === 'rejected' ? 'Rejected' : 
                           grievance.status === 'assigned' ? 'Assigned' : 'Pending'}
                        </span>
                      </div>
                    </div>
                    
                    <h4 style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: '#ffffff' 
                    }}>
                      {/* Use real title or description from the data */}
                      {grievance.title || `${grievance.category} Issue`}
                    </h4>
                    
                    <p style={{ 
                      margin: '0 0 16px 0', 
                      fontSize: '14px', 
                      color: '#a0a9b8',
                      lineHeight: '1.5'
                    }}>
                      {grievance.description ? 
                        (grievance.description.length > 100 ? 
                          grievance.description.substring(0, 100) + '...' : 
                          grievance.description) : 
                        'No description provided'}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#a0a9b8' }}>
                      {/* Use real location from the data */}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-map-marker-alt" style={{ color: '#00ff87' }}></i>
                        {grievance.address || 
                          (grievance.latitude && grievance.longitude ? 
                            `${typeof grievance.latitude === 'number' ? grievance.latitude.toFixed(6) : parseFloat(grievance.latitude).toFixed(6)}, 
                             ${typeof grievance.longitude === 'number' ? grievance.longitude.toFixed(6) : parseFloat(grievance.longitude).toFixed(6)}` :
                            'No location')}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-calendar-alt" style={{ color: '#00ff87' }}></i>
                        {grievance.dateSubmitted}
                      </span>
                    </div>
                  </div>
                ))}

                {/* View All Reports Button */}
                <button
                  onClick={() => {
                    // This just expands the current view to show all grievances
                    const allGrievances = document.getElementById('all-grievances');
                    const previewGrievances = document.getElementById('preview-grievances');
                    if (allGrievances) allGrievances.style.display = 'block';
                    if (previewGrievances) previewGrievances.style.display = 'none';
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 217, 111, 0.2))',
                    color: '#00ff87',
                    border: '1px solid rgba(0, 255, 135, 0.3)',
                    borderRadius: '15px',
                    fontWeight: '600',
                    fontSize: '16px',
                    textAlign: 'center',
                    marginTop: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, #00ff87, #00d96f)';
                    e.target.style.color = '#0a0b0d';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(0, 255, 135, 0.2), rgba(0, 217, 111, 0.2))';
                    e.target.style.color = '#00ff87';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                  id="view-all-button"
                >
                  <i className="fas fa-list" style={{ marginRight: '8px' }}></i>
                  View All Reports
                </button>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: '#a0a9b8'
              }}>
                <div style={{
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, rgba(0, 255, 135, 0.1), rgba(0, 217, 111, 0.1))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '2px solid rgba(0, 255, 135, 0.2)'
                }}>
                  <i className="fas fa-file-alt" style={{ fontSize: '40px', color: '#00ff87', opacity: '0.7' }}></i>
                </div>
                <p style={{ marginBottom: '24px', fontSize: '16px', fontWeight: '500' }}>
                  You haven't submitted any grievances yet.
                </p>
                <Link 
                  to="/citizen/submit-grievance"
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                    color: '#0a0b0d',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontWeight: '600',
                    fontSize: '14px',
                    display: 'inline-flex',
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
                  <i className="fas fa-plus"></i>
                  Submit Your First Grievance
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Hidden Full Grievances List - shown when "View All" is clicked */}
        <div 
          id="all-grievances" 
          style={{ 
            display: 'none',
            maxWidth: '1200px',
            margin: '40px auto 0',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '40px',
            border: '1px solid rgba(0, 255, 135, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px'
          }}>
            <h2 style={{ margin: '0', color: '#ffffff', fontSize: '24px', fontWeight: '700' }}>
              <i className="fas fa-list-alt" style={{ marginRight: '12px', color: '#00ff87' }}></i>
              All My Grievances
            </h2>
            <button
              onClick={() => {
                document.getElementById('all-grievances').style.display = 'none';
                document.getElementById('preview-grievances').style.display = 'block';
              }}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#a0a9b8',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#a0a9b8';
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Back to Dashboard
            </button>
          </div>
          
          {/* Table for all grievances - uses original table format */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '15px',
            overflow: 'hidden',
            border: '1px solid rgba(0, 255, 135, 0.1)'
          }}>
            {/* Table Header */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr',
              padding: '20px',
              background: 'rgba(0, 255, 135, 0.1)',
              borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
              fontWeight: '600',
              color: '#00ff87',
              fontSize: '14px'
            }}>
              <div><i className="fas fa-hashtag"></i></div>
              <div><i className="fas fa-image"></i> Image</div>
              <div><i className="fas fa-file-alt"></i> Title</div>
              <div><i className="fas fa-tag"></i> Category</div>
              <div><i className="fas fa-info-circle"></i> Status</div>
              <div><i className="fas fa-calendar"></i> Date</div>
              <div><i className="fas fa-map-marker-alt"></i> Location</div>
            </div>
            
            {/* Table Body */}
            {grievances.map((grievance) => (
              <div 
                key={grievance.id}
                style={{ 
                  display: 'grid',
                  gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr',
                  padding: '20px',
                  borderBottom: '1px solid rgba(0, 255, 135, 0.1)',
                  alignItems: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  color: '#ffffff'
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
                      src={constructImageUrl(grievance.image_path)}
                      alt="Grievance"
                      style={{
                        width: '60px',
                        height: '40px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleImageClick(constructImageUrl(grievance.image_path))}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : <span style={{ fontSize: '12px', color: '#a0a9b8' }}>No image</span>}
                  <span style={{ display: 'none', fontSize: '12px', color: '#a0a9b8' }}>No image</span>
                </div>
                <div style={{ fontWeight: '500', color: '#ffffff' }}>{grievance.title}</div>
                <div style={{ color: '#a0a9b8' }}>{grievance.category}</div>
                <div>{getStatusBadge(grievance.status)}</div>
                <div style={{ color: '#a0a9b8' }}>{grievance.dateSubmitted}</div>
                <div 
                  style={{ 
                    fontSize: '12px', 
                    color: grievance.latitude !== undefined && grievance.longitude !== undefined ? '#00ff87' : '#a0a9b8',
                    cursor: grievance.latitude !== undefined && grievance.longitude !== undefined ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => {
                    if (grievance.latitude !== undefined && grievance.longitude !== undefined) {
                      handleLocationClick(grievance);
                    }
                  }}
                  onMouseOver={(e) => {
                    if (grievance.latitude !== undefined && grievance.longitude !== undefined) {
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.textDecoration = 'underline';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (grievance.latitude !== undefined && grievance.longitude !== undefined) {
                      e.currentTarget.style.color = '#00ff87';
                      e.currentTarget.style.textDecoration = 'none';
                    }
                  }}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  {grievance.latitude !== undefined && grievance.longitude !== undefined ? (
                    <span>Click to view location</span>
                  ) : (
                    <span>No coordinates</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      
      {/* Footer */}
      <footer style={{ 
        padding: '30px',
        textAlign: 'center',
        color: '#a0a9b8',
        borderTop: '1px solid rgba(0, 255, 135, 0.2)',
        marginTop: '60px',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          © 2025 Municipal Reporter. All rights reserved.
        </p>
      </footer>
      </main>

      {/* Location Modal */}
      {locationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1b1f 0%, #2a2b2f 100%)',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            border: '1px solid rgba(0, 255, 135, 0.3)',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid rgba(0, 255, 135, 0.2)'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  color: '#ffffff',
                  fontSize: '24px',
                  fontWeight: '700'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#00ff87', marginRight: '10px' }}></i>
                  Grievance Location
                </h3>
                <p style={{
                  margin: '5px 0 0 0',
                  color: '#a0a9b8',
                  fontSize: '16px'
                }}>
                  {locationModal.title || `${locationModal.category} Issue`}
                </p>
              </div>
              <button
                onClick={closeLocationModal}
                style={{
                  background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                  color: '#0a0b0d',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Location Information */}
            <div style={{
              background: 'rgba(0, 255, 135, 0.05)',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
              border: '1px solid rgba(0, 255, 135, 0.2)'
            }}>
              <h4 style={{
                margin: '0 0 10px 0',
                color: '#00ff87',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                Address
              </h4>
              <p style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                {locationName}
              </p>
              <div style={{
                marginTop: '10px',
                display: 'flex',
                gap: '20px',
                fontSize: '12px',
                color: '#a0a9b8'
              }}>
                <span>
                  <i className="fas fa-globe" style={{ marginRight: '5px' }}></i>
                  Lat: {typeof locationModal.latitude === 'number' ? locationModal.latitude.toFixed(6) : parseFloat(locationModal.latitude).toFixed(6)}
                </span>
                <span>
                  <i className="fas fa-globe" style={{ marginRight: '5px' }}></i>
                  Lng: {typeof locationModal.longitude === 'number' ? locationModal.longitude.toFixed(6) : parseFloat(locationModal.longitude).toFixed(6)}
                </span>
              </div>
            </div>

            {/* Map Container */}
            <div style={{
              height: '400px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 255, 135, 0.3)',
              background: '#1a1b1f'
            }}>
              <div 
                id="location-modal-map" 
                style={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '12px'
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(10, 11, 13, 0.95)',
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
                borderRadius: '15px',
                border: '2px solid rgba(0, 255, 135, 0.3)'
              }}
            />
            <button
              onClick={closeImageModal}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'linear-gradient(135deg, #00ff87, #00d96f)',
                color: '#0a0b0d',
                border: 'none',
                borderRadius: '50%',
                width: '50px',
                height: '50px',
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenDashboard;
