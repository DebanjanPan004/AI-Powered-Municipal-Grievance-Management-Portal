import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Custom map component for displaying grievance location
const LocationMap = ({ latitude, longitude, locationName }) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  useEffect(() => {
    // Only initialize the map if we have valid coordinates and the container exists
    if (
      mapContainerRef.current && 
      latitude !== undefined && 
      longitude !== undefined &&
      !isNaN(parseFloat(latitude)) && 
      !isNaN(parseFloat(longitude))
    ) {
      // Convert coordinates to numbers to ensure they work with Leaflet
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      // If a map already exists, remove it before creating a new one
      if (mapRef.current) {
        mapRef.current.remove();
      }
      
      // Create the map instance
      const map = L.map(mapContainerRef.current).setView([lat, lng], 15);
      
      // Add the OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      
      // Create a custom icon for the marker
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-pulse"></div>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      
      // Add a marker with the custom icon
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      
      // Create popup content with location name if available
      const popupContent = locationName && locationName !== 'Loading location...' 
        ? `<div style="color: #333; max-width: 250px;"><b>Grievance Location</b><br/>${locationName}<br/><small>Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}</small></div>`
        : `<b>Grievance Location</b><br>Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      
      marker.bindPopup(popupContent).openPopup();
      
      // Store the map instance in the ref
      mapRef.current = map;
      
      // Make sure the map is properly sized after initializing
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }
    
    // Cleanup function to remove the map when component unmounts
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, locationName]); // Re-initialize when coordinates or location name changes

  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        height: '300px', 
        width: '100%', 
        borderRadius: '12px',
        marginTop: '12px',
        marginBottom: '0',
        border: '2px solid rgba(0, 255, 135, 0.3)',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0, 255, 135, 0.2)'
      }}
    ></div>
  );
};

// Import the custom Leaflet styles
import '../styles/leaflet-custom.css';

// Dynamically load Leaflet CSS from node_modules
const WorkerDashboard = ({ user }) => {
  // Load Leaflet CSS
  useEffect(() => {
    // Import Leaflet CSS
    import('leaflet/dist/leaflet.css')
      .catch(err => console.error('Failed to load Leaflet CSS:', err));
  }, []);

  const [assignedGrievances, setAssignedGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLastUpdated, setLocationLastUpdated] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [locationUpdateLoading, setLocationUpdateLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedGrievance, setSelectedGrievance] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [locationName, setLocationName] = useState('');
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
    
    // Fetch worker's assigned grievances from API
    fetchAssignedGrievances();
    
    // Check if location was just updated
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('locationUpdated') === 'true') {
      setError(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const fetchAssignedGrievances = async () => {
    try {
      setLoading(true);
      
      // Fetch worker's assigned grievances from API
      console.log('Fetching assigned grievances for worker');
      const grievanceResponse = await fetch(`${import.meta.env.VITE_API_URL}/grievances/worker/assigned`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (!grievanceResponse.ok) {
        let errorText;
        try {
          // Try to parse as JSON first
          const errorJson = await grievanceResponse.json();
          errorText = JSON.stringify(errorJson);
        } catch (e) {
          // If it's not JSON, get as text
          errorText = await grievanceResponse.text();
        }
        console.error('API error fetching assigned grievances:', grievanceResponse.status, errorText);
        throw new Error(`Failed to fetch assigned grievances: ${grievanceResponse.status} ${errorText}`);
      }
      
      const grievanceData = await grievanceResponse.json();
      console.log('Received grievance data:', grievanceData);
      
      // Format the grievance data with complete information
      const formattedGrievances = grievanceData.grievances.map(g => ({
        id: g.grievance_id,
        assignmentId: g.assignment_id, // Add assignment ID
        title: g.description.substring(0, 30) + (g.description.length > 30 ? '...' : ''),
        description: g.description,
        category: g.category || 'General',
        status: g.status,
        assignmentStatus: g.assignment_status || 'assigned',
        dateAssigned: new Date(g.assigned_at).toISOString().split('T')[0],
        address: g.address,
        latitude: g.latitude,
        longitude: g.longitude,
        image_path: g.image_path,
        citizen: g.citizen,
        priority: g.priority || 'medium',
        assignedBy: g.assigned_by_name || 'Admin'
      }));
      
      setAssignedGrievances(formattedGrievances);
      
      // Fetch worker's latest location data with cache busting to ensure fresh data
      const timestamp = new Date().getTime();
      const locationResponse = await fetch(`${import.meta.env.VITE_API_URL}/workers/my-location?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (locationResponse.ok) {
        const locationData = await locationResponse.json();
        
        if (locationData.lastUpdate) {
          // Format the timestamp to a readable date/time
          const lastUpdated = new Date(locationData.lastUpdate).toLocaleString();
          setLocationLastUpdated(lastUpdated);
          
          // If we have coordinates, update the current location state
          if (locationData.latitude && locationData.longitude) {
            // Only update if not currently editing
            if (!showLocationEditor) {
              setCurrentLocation({
                lat: parseFloat(locationData.latitude),
                lng: parseFloat(locationData.longitude)
              });
            }
            
            console.log('Retrieved saved location:', {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              lastUpdated: lastUpdated
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const updateMyLocation = () => {
    setError(null);
    setLocationUpdateLoading(true);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocationUpdateLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(newLocation);
        setShowLocationEditor(true);
        setLocationUpdateLoading(false);
      },
      (err) => {
        setError('Unable to retrieve your location: ' + err.message);
        setLocationUpdateLoading(false);
      }
    );
  };
  
  const handleLocationInputChange = (e, field) => {
    const value = e.target.value;
    // Allow only numbers, period and negative sign for coordinates
    if (/^-?\d*\.?\d*$/.test(value) || value === '') {
      setCurrentLocation({
        ...currentLocation,
        [field]: value === '' ? '' : parseFloat(value)
      });
    }
  };
  
  const handleSaveLocation = async () => {
    if (!currentLocation || 
        isNaN(currentLocation.lat) || 
        isNaN(currentLocation.lng) ||
        currentLocation.lat < -90 || 
        currentLocation.lat > 90 ||
        currentLocation.lng < -180 || 
        currentLocation.lng > 180) {
      setError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
      return;
    }
    
    try {
      setLocationUpdateLoading(true);
      
      // Get pincode or address information based on coordinates
      let address = `Coordinates: ${currentLocation.lat}, ${currentLocation.lng}`;
      let pincode = '';
      
      try {
        // Try to get address information from our geocoding service
        const geocodeResponse = await fetch(`${import.meta.env.VITE_API_URL}/geocode?lat=${currentLocation.lat}&lng=${currentLocation.lng}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.address) {
            address = geocodeData.address;
          }
          if (geocodeData.pincode) {
            pincode = geocodeData.pincode;
          }
        }
      } catch (geocodeErr) {
        console.warn('Could not retrieve address from coordinates:', geocodeErr);
        // Continue with saving location even if geocoding fails
      }
      
      // Save worker location to the database
      // Format matches exactly what the UpdateWorkerLocation stored procedure expects
      const response = await fetch(`${import.meta.env.VITE_API_URL}/workers/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          address: address
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save worker location');
      }
      
      const responseData = await response.json();
      
      // Show success message
      alert('Your location has been successfully updated and saved to the database.');
      
      // Update the last updated time
      setLocationLastUpdated(new Date().toLocaleString());
      setShowLocationEditor(false);
      
      // Refresh the worker's data to show the updated information
      fetchAssignedGrievances();
      
      console.log('Location saved successfully:', responseData);
      
    } catch (err) {
      setError(err.message || 'Failed to save location data');
      console.error('Error saving location:', err);
    } finally {
      setLocationUpdateLoading(false);
    }
  };
  
  const handleCancelLocationUpdate = () => {
    setShowLocationEditor(false);
    setCurrentLocation(null);
  };
  
  const handleGrievanceClick = async (grievance) => {
    setSelectedGrievance(grievance);
    setDetailModalOpen(true);
    setLocationName('Loading location...');

    // Get readable address from coordinates using reverse geocoding
    if (grievance.latitude && grievance.longitude) {
      try {
        const lat = parseFloat(grievance.latitude);
        const lng = parseFloat(grievance.longitude);
        
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setLocationName(address);
      } catch (err) {
        console.error('Reverse geocoding error:', err);
        const lat = parseFloat(grievance.latitude);
        const lng = parseFloat(grievance.longitude);
        setLocationName(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    } else {
      setLocationName('No location data available');
    }
  };
  
  const handleImageClick = (imagePath) => {
    setSelectedImage(`${import.meta.env.VITE_API_URL.replace('/api', '')}${imagePath}`);
  };
  
  const closeImageModal = () => {
    setSelectedImage(null);
  };
  
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedGrievance(null);
    setLocationName('');
  };
  
  const handleAssignmentStatusUpdate = async (newStatus) => {
    if (!selectedGrievance || !selectedGrievance.assignmentId) return;
    
    try {
      setStatusUpdateLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/assignments/${selectedGrievance.assignmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update assignment status');
      }
      
      // Update the local state
      setAssignedGrievances(prev => 
        prev.map(g => 
          g.assignmentId === selectedGrievance.assignmentId ? { ...g, assignmentStatus: newStatus } : g
        )
      );
      
      // If marked as completed, close the detail modal
      if (newStatus === 'completed') {
        setDetailModalOpen(false);
        setSelectedGrievance(null);
        
        // Refresh the list after a short delay to show updated status
        setTimeout(() => {
          fetchAssignedGrievances();
        }, 500);
      } else {
        // Otherwise update the selected grievance state
        setSelectedGrievance({ ...selectedGrievance, assignmentStatus: newStatus });
      }
      
      // Show success message
      alert(`Assignment status updated to ${newStatus}.`);
      
    } catch (error) {
      console.error('Error updating assignment status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };
  
  // Keep the original method for backwards compatibility
  const handleStatusUpdate = async (newStatus) => {
    if (!selectedGrievance) return;
    
    try {
      setStatusUpdateLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/status/${selectedGrievance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update grievance status');
      }
      
      // Update the local state
      setAssignedGrievances(prev => 
        prev.map(g => 
          g.id === selectedGrievance.id ? { ...g, status: newStatus } : g
        )
      );
      
      // If marked as completed, close the detail modal
      if (newStatus === 'completed') {
        setDetailModalOpen(false);
        setSelectedGrievance(null);
      } else {
        // Otherwise update the selected grievance state
        setSelectedGrievance({ ...selectedGrievance, status: newStatus });
      }
      
      // Show success message
      alert(`Grievance status updated to ${newStatus}.`);
      
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      // Grievance statuses
      pending: { bg: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', border: 'rgba(255, 152, 0, 0.3)' },
      assigned: { bg: 'rgba(33, 150, 243, 0.2)', color: '#64b5f6', border: 'rgba(33, 150, 243, 0.3)' },
      working: { bg: 'rgba(76, 175, 80, 0.2)', color: '#81c784', border: 'rgba(76, 175, 80, 0.3)' },
      completed: { bg: 'rgba(0, 255, 135, 0.2)', color: '#00ff87', border: 'rgba(0, 255, 135, 0.3)' },
      rejected: { bg: 'rgba(244, 67, 54, 0.2)', color: '#ff6b6b', border: 'rgba(244, 67, 54, 0.3)' },
      
      // Assignment statuses
      'in-progress': { bg: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', border: 'rgba(255, 152, 0, 0.3)' }
    };
    
    const style = statusStyles[status] || statusStyles.pending;
    
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
        {status.replace('_', ' ')}
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

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1f 100%)',
      fontFamily: '"Inter", sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{ 
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
        padding: '20px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <i className="fas fa-hard-hat" style={{ 
            fontSize: '28px', 
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
            Worker Dashboard
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: '20px', textAlign: 'right' }}>
            <p style={{ 
              margin: '0', 
              color: '#ffffff', 
              fontWeight: '600', 
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <i className="fas fa-user-hard-hat" style={{ color: '#00ff87' }}></i>
              {user.name}
            </p>
            <p style={{ 
              margin: '0', 
              color: '#a0a9b8', 
              fontSize: '14px' 
            }}>
              Municipal Worker
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
      <main style={{ 
        padding: '30px', 
        flex: 1 
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {/* Location Update Section */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '24px',
            borderRadius: '16px',
            marginBottom: '30px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showLocationEditor ? '20px' : '0' }}>
              <div>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="fas fa-map-marker-alt" style={{ color: '#00ff87' }}></i>
                  Your Location
                </h3>
                <p style={{ 
                  margin: '0', 
                  color: '#a0a9b8',
                  fontSize: '14px'
                }}>
                  {locationLastUpdated ? 
                    `Last updated: ${locationLastUpdated}` : 
                    'Your location has not been updated yet'}
                </p>
              </div>
              
              {!showLocationEditor && (
                <button
                  onClick={updateMyLocation}
                  disabled={locationUpdateLoading}
                  style={{
                    padding: '12px 24px',
                    background: locationUpdateLoading ? 'rgba(0, 255, 135, 0.3)' : 'linear-gradient(135deg, #00ff87, #00d96f)',
                    color: locationUpdateLoading ? '#a0a9b8' : '#0a0b0d',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: locationUpdateLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!locationUpdateLoading) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!locationUpdateLoading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  <i className={locationUpdateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-location-arrow'}></i>
                  {locationUpdateLoading ? 'Getting Location...' : 'Update My Location'}
                </button>
              )}
            </div>
            
            {error && (
              <div style={{ 
                marginTop: '20px',
                padding: '16px 20px',
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ff6b6b' }}></i>
                <span style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: '500' }}>
                  {error}
                </span>
              </div>
            )}
            
            {showLocationEditor && currentLocation && (
              <div style={{ 
                marginTop: '20px',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px'
              }}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}>
                    Latitude:
                  </label>
                  <input
                    type="text"
                    value={currentLocation.lat}
                    onChange={(e) => handleLocationInputChange(e, 'lat')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: '"JetBrains Mono", "Consolas", monospace'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '8px', 
                    fontWeight: '600',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}>
                    Longitude:
                  </label>
                  <input
                    type="text"
                    value={currentLocation.lng}
                    onChange={(e) => handleLocationInputChange(e, 'lng')}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontFamily: '"JetBrains Mono", "Consolas", monospace'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button
                    onClick={handleCancelLocationUpdate}
                    style={{
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#a0a9b8',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
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
                    Cancel
                  </button>
                  
                  <button
                    onClick={handleSaveLocation}
                    disabled={locationUpdateLoading}
                    style={{
                      padding: '10px 24px',
                      background: locationUpdateLoading ? 'rgba(0, 255, 135, 0.3)' : 'linear-gradient(135deg, #00ff87, #00d96f)',
                      color: locationUpdateLoading ? '#a0a9b8' : '#0a0b0d',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: locationUpdateLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!locationUpdateLoading) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!locationUpdateLoading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <i className={locationUpdateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-save'}></i>
                    {locationUpdateLoading ? 'Saving...' : 'Save Location'}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Assigned Grievances Section */}
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: '0 0 24px 0', 
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-tasks" style={{ color: '#00ff87' }}></i>
              Assigned Grievances
            </h2>
            
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
                  Loading assigned grievances...
                </p>
              </div>
            ) : assignedGrievances.length > 0 ? (
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}>
                {/* Table Header */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '50px 1.5fr 1fr 1fr 1fr 1fr',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderBottom: '1px solid rgba(0, 255, 135, 0.2)',
                  fontWeight: '700',
                  color: '#ffffff',
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px'
                }}>
                  <div>ID</div>
                  <div>Title</div>
                  <div>Status</div>
                  <div>Assignment</div>
                  <div>Assigned By</div>
                  <div>Date</div>
                </div>
                
                {/* Table Body */}
                {assignedGrievances.map((grievance, index) => (
                  <div 
                    key={grievance.id}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '50px 1.5fr 1fr 1fr 1fr 1fr',
                      padding: '18px 20px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      alignItems: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      color: '#ffffff',
                      background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)'
                    }}
                    onClick={() => handleGrievanceClick(grievance)}
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
                    <div style={{ fontWeight: '600', color: '#00ff87' }}>{grievance.id}</div>
                    <div style={{ fontWeight: '500', color: '#ffffff' }}>{grievance.title}</div>
                    <div>{getStatusBadge(grievance.status)}</div>
                    <div>{getStatusBadge(grievance.assignmentStatus)}</div>
                    <div style={{ color: '#64b5f6' }}>{grievance.assignedBy}</div>
                    <div style={{ color: '#a0a9b8' }}>{grievance.dateAssigned}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ 
                padding: '60px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <p style={{ 
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  No assigned grievances
                </p>
                <p style={{ 
                  color: '#a0a9b8',
                  fontSize: '14px',
                  margin: '0'
                }}>
                  You don't have any assigned grievances at the moment.
                </p>
              </div>
            )}
          </div>
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
      
      {/* Detail Modal */}
      {detailModalOpen && selectedGrievance && (
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
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '30px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            <button
              onClick={closeDetailModal}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
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
            
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '24px', 
              color: '#ffffff',
              fontSize: '24px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '2px solid rgba(0, 255, 135, 0.2)'
            }}>
              <i className="fas fa-file-alt" style={{ color: '#00ff87' }}></i>
              Grievance #{selectedGrievance.id} Details
            </h2>
            
            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
              
              {/* Left Column - Basic Information */}
              <div>
                {/* Section 1: Visual Evidence */}
                {selectedGrievance.image_path && (
                  <div style={{ 
                    marginBottom: '30px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 16px 0', 
                      color: '#00ff87',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-camera"></i>
                      Visual Evidence
                    </h3>
                    <img 
                      src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${selectedGrievance.image_path}`} 
                      alt="Grievance"
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '200px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        border: '2px solid rgba(0, 255, 135, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => handleImageClick(selectedGrievance.image_path)}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.02)';
                        e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Section 2: Grievance Details */}
                <div style={{ 
                  marginBottom: '30px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#00ff87',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-info-circle"></i>
                    Grievance Details
                  </h3>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Description
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      color: '#a0a9b8', 
                      lineHeight: '1.6',
                      background: 'rgba(255, 255, 255, 0.05)',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      fontSize: '14px'
                    }}>
                      {selectedGrievance.description}
                    </p>
                  </div>
                  
                  <div>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      Submitted By
                    </h4>
                    <p style={{ 
                      margin: '0', 
                      color: '#64b5f6',
                      background: 'rgba(100, 181, 246, 0.1)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(100, 181, 246, 0.2)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <i className="fas fa-user" style={{ marginRight: '6px' }}></i>
                      {selectedGrievance.citizen ? selectedGrievance.citizen.full_name : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Status & Actions */}
              <div>
                {/* Section 3: Status Information */}
                <div style={{ 
                  marginBottom: '30px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#00ff87',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-chart-line"></i>
                    Status Information
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        Grievance Status
                      </h4>
                      <div>{getStatusBadge(selectedGrievance.status)}</div>
                    </div>
                    
                    <div>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        Assignment Status
                      </h4>
                      <div>{getStatusBadge(selectedGrievance.assignmentStatus)}</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        Assigned By
                      </h4>
                      <p style={{ 
                        margin: '0', 
                        color: '#64b5f6',
                        background: 'rgba(100, 181, 246, 0.1)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(100, 181, 246, 0.2)',
                        fontSize: '13px',
                        fontWeight: '500'
                      }}>
                        <i className="fas fa-user-tie" style={{ marginRight: '6px' }}></i>
                        {selectedGrievance.assignedBy}
                      </p>
                    </div>
                    
                    <div>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        Date Assigned
                      </h4>
                      <p style={{ 
                        margin: '0', 
                        color: '#a0a9b8',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        fontFamily: '"JetBrains Mono", "Consolas", monospace',
                        fontSize: '13px'
                      }}>
                        <i className="fas fa-calendar" style={{ marginRight: '6px' }}></i>
                        {selectedGrievance.dateAssigned}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Section 4: Location Information */}
                <div style={{ 
                  marginBottom: '30px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 16px 0', 
                    color: '#00ff87',
                    fontSize: '18px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-map-marker-alt"></i>
                    Location Information
                  </h3>
                  
                  {/* Location Address */}
                  <div style={{
                    background: 'rgba(0, 255, 135, 0.05)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    border: '1px solid rgba(0, 255, 135, 0.2)'
                  }}>
                    <h5 style={{
                      margin: '0 0 8px 0',
                      color: '#00ff87',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}>
                      <i className="fas fa-location-arrow" style={{ marginRight: '6px' }}></i>
                      Address
                    </h5>
                    <p style={{
                      margin: 0,
                      color: '#ffffff',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      {locationName}
                    </p>
                  </div>
                  
                  {/* Coordinates */}
                  <div style={{ 
                    margin: '0 0 12px 0', 
                    color: '#ffb74d',
                    background: 'rgba(255, 183, 77, 0.1)',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 183, 77, 0.2)',
                    fontFamily: '"JetBrains Mono", "Consolas", monospace',
                    fontSize: '12px'
                  }}>
                    <strong style={{ color: '#ffffff' }}>Coordinates:</strong> {selectedGrievance.latitude}, {selectedGrievance.longitude}
                  </div>
                  
                  {/* Map component */}
                  <LocationMap 
                    latitude={selectedGrievance.latitude}
                    longitude={selectedGrievance.longitude}
                    locationName={locationName}
                  />
                </div>
                
                {/* Section 5: Actions */}
                {selectedGrievance.assignmentStatus !== 'completed' && (
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)'
                  }}>
                    <h3 style={{ 
                      margin: '0 0 16px 0', 
                      color: '#00ff87',
                      fontSize: '18px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <i className="fas fa-tasks"></i>
                      Update Assignment
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {selectedGrievance.assignmentStatus === 'assigned' && (
                        <button
                          onClick={() => handleAssignmentStatusUpdate('working')}
                          disabled={statusUpdateLoading}
                          style={{
                            padding: '12px 20px',
                            background: statusUpdateLoading ? 'rgba(33, 150, 243, 0.3)' : 'linear-gradient(135deg, #2196F3, #1976D2)',
                            color: statusUpdateLoading ? '#a0a9b8' : '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: statusUpdateLoading ? 'not-allowed' : 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!statusUpdateLoading) {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!statusUpdateLoading) {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                            }
                          }}
                        >
                          <i className={statusUpdateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-play'}></i>
                          Start Working
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleAssignmentStatusUpdate('completed')}
                        disabled={statusUpdateLoading}
                        style={{
                          padding: '12px 20px',
                          background: statusUpdateLoading ? 'rgba(0, 255, 135, 0.3)' : 'linear-gradient(135deg, #00ff87, #00d96f)',
                          color: statusUpdateLoading ? '#a0a9b8' : '#0a0b0d',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: statusUpdateLoading ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!statusUpdateLoading) {
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!statusUpdateLoading) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                      >
                        <i className={statusUpdateLoading ? 'fas fa-spinner fa-spin' : 'fas fa-check'}></i>
                        Mark as Completed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Image Modal */}
      {selectedImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90%',
            maxHeight: '90%'
          }}>
            <img 
              src={selectedImage} 
              alt="Full size" 
              style={{
                maxWidth: '100%',
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
        </div>
      )}
    </div>
  );
};

export default WorkerDashboard;
