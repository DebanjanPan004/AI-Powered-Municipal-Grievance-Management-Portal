import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const LocationCapture = ({ user, userType }) => {
  const [location, setLocation] = useState(null);
  const [editedLocation, setEditedLocation] = useState(null);
  const [pincode, setPincode] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const locationState = useLocation().state;
  
  useEffect(() => {
    console.log('LocationCapture mounted, locationState:', locationState);
    
    if (locationState && locationState.fromGrievanceForm) {
      console.log('Coming from grievance form, auto-capturing location...');
      // We have a grievance form submission, auto-capture location
      handleFindLocation();
    } else if (userType === 'worker') {
      console.log('Worker accessing location page');
      // Worker can manually capture location
    } else {
      console.log('Unknown state, redirecting to appropriate page');
      // If neither condition is met, redirect appropriately
      navigate(userType === 'worker' ? '/worker/dashboard' : '/citizen/dashboard');
    }
  }, [locationState, userType]);
  
  const handleFindLocation = () => {
    setSaved(false);
    setLoading(true);
    setError(null); // Clear any previous errors
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocation(null);
      setEditedLocation(null);
      setLoading(false);
      return;
    }

    console.log('Starting location capture...');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('Location captured successfully:', pos.coords);
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setLocation(newLocation);
        setEditedLocation(newLocation);
        setError(null);
        
        // In a real app, you would call your API to get the pincode based on coordinates
        // For demo, we'll simulate this with a function
        fetchPincode(newLocation.lat, newLocation.lng);
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Unable to retrieve your location: ';
        
        switch(err.code) {
          case err.PERMISSION_DENIED:
            errorMessage += 'Permission denied. Please enable location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage += 'Position unavailable. Please check your internet connection.';
            break;
          case err.TIMEOUT:
            errorMessage += 'Request timeout. Please try again.';
            break;
          default:
            errorMessage += err.message;
            break;
        }
        
        setError(errorMessage);
        setLocation(null);
        setEditedLocation(null);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };
  
  // Function to get address from coordinates
  const fetchPincode = async (lat, lng) => {
    try {
      // Make a request to our backend to get address from coordinates
      const response = await fetch(`${import.meta.env.VITE_API_URL}/geocode?lat=${lat}&lng=${lng}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      }).catch(err => {
        console.error('Error fetching address:', err);
        // If API fails, use a default pincode based on coordinates
        if (lat > 20) {
          setPincode('110001'); // Delhi
        } else if (lng > 80) {
          setPincode('700001'); // Kolkata
        } else if (lat < 15) {
          setPincode('600001'); // Chennai
        } else {
          setPincode('400001'); // Mumbai
        }
      });
      
      if (response && response.ok) {
        const data = await response.json();
        setPincode(data.pincode || '');
      }
    } catch (err) {
      console.error('Error processing address:', err);
    }
  };
  
  const handleInputChange = (e, field) => {
    const value = e.target.value;
    // Allow only numbers, period and negative sign for coordinates
    if (/^-?\d*\.?\d*$/.test(value) || value === '') {
      setEditedLocation({
        ...editedLocation,
        [field]: value === '' ? '' : parseFloat(value)
      });
      setSaved(false);
    }
  };
  
  const handlePincodeChange = (e) => {
    // Allow only numbers for pincode
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPincode(value);
    }
  };
  
  const handleSave = async () => {
    if (editedLocation && 
        !isNaN(editedLocation.lat) && 
        !isNaN(editedLocation.lng) &&
        editedLocation.lat >= -90 && 
        editedLocation.lat <= 90 &&
        editedLocation.lng >= -180 && 
        editedLocation.lng <= 180) {
      
      setLocation(editedLocation);
      setSaved(true);
      
      try {
        if (userType === 'worker') {
          // For workers, save their current location to the database
          const response = await fetch(`${import.meta.env.VITE_API_URL}/workers/location`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify({
              latitude: editedLocation.lat,
              longitude: editedLocation.lng,
              address: `PIN: ${pincode}, Coordinates: ${editedLocation.lat}, ${editedLocation.lng}`
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save worker location');
          }
          
          // Navigate back to worker dashboard after saving
          navigate('/worker/dashboard', { 
            state: { 
              locationUpdated: true,
              lastLocation: editedLocation
            }
          });
        } else {
          // For citizens submitting a grievance
          // Get the grievance data from session storage
          const grievanceDataString = sessionStorage.getItem('grievanceData');
          const imageDataUrl = sessionStorage.getItem('grievanceImage');
          
          if (!grievanceDataString || !imageDataUrl) {
            throw new Error('Missing grievance data. Please try again.');
          }
          
          const grievanceData = JSON.parse(grievanceDataString);
          
          // Convert data URL to blob for upload
          const fetchResponse = await fetch(imageDataUrl);
          const blob = await fetchResponse.blob();
          const imageFile = new File([blob], 'grievance-photo.jpg', { type: 'image/jpeg' });
          
          // Create form data for multipart upload
          const formData = new FormData();
          formData.append('image', imageFile);
          formData.append('title', grievanceData.title);
          formData.append('category', grievanceData.category);
          formData.append('description', grievanceData.description);
          formData.append('latitude', editedLocation.lat);
          formData.append('longitude', editedLocation.lng);
          formData.append('address', `PIN: ${pincode}, Coordinates: ${editedLocation.lat}, ${editedLocation.lng}`);
          
          // Submit the grievance with image and location
          const submitResponse = await fetch(`${import.meta.env.VITE_API_URL}/grievances/submit`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.token}`
            },
            body: formData
          });
          
          if (!submitResponse.ok) {
            const errorData = await submitResponse.json();
            throw new Error(errorData.error || 'Failed to submit grievance');
          }
          
          // Clear session storage
          sessionStorage.removeItem('grievanceData');
          sessionStorage.removeItem('grievanceImage');
          
          // Navigate back to citizen dashboard after saving
          navigate('/citizen/dashboard', { 
            state: { 
              grievanceSubmitted: true,
              message: 'Your grievance has been submitted successfully!'
            }
          });
        }
      } catch (err) {
        setError(err.message || 'Failed to save location data');
        setSaved(false);
      }
    } else {
      setError('Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.');
    }
  };
  
  const handleCancel = () => {
    if (userType === 'worker') {
      navigate('/worker/dashboard');
    } else {
      navigate('/citizen/submit-grievance');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'column', 
      justifyContent: 'center', 
      alignItems: 'center', 
      fontFamily: 'Poppins, sans-serif',
      background: '#fdb813',
      backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.25) 0%, rgba(255,196,12,0.5) 100%), url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
      color: '#333',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div style={{
        width: '90%',
        maxWidth: '500px',
        background: 'white',
        borderRadius: '15px',
        padding: '2.5rem 3rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '20px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23fdb813' width='36' height='36'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E"
            alt="Location"
            style={{ marginRight: '12px' }}
          />
          <h2 style={{ 
            fontSize: 'clamp(1.8rem, 5vw, 2.2rem)', 
            fontWeight: '700',
            letterSpacing: '0.5px',
            textAlign: 'center',
            color: '#333'
          }}>
            {userType === 'worker' ? 'Update Your Location' : 'Confirm Location for Grievance'}
          </h2>
        </div>

        {locationState && locationState.fromGrievanceForm && (
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            border: '1px solid #ffeaa7'
          }}>
            <p style={{ margin: '0', color: '#856404', fontSize: '14px', fontWeight: '500' }}>
              📝 Great! Your grievance details have been saved. Now we need to capture the location where the issue occurred.
            </p>
          </div>
        )}
        
        {locationState && locationState.imageData && (
          <div style={{ marginBottom: '1.5rem', textAlign: 'center', width: '100%' }}>
            <p style={{ marginBottom: '10px', fontSize: '16px', fontWeight: '500' }}>Uploaded Image:</p>
            <img 
              src={locationState.imageData} 
              alt="Grievance" 
              style={{ 
                maxWidth: '100%', 
                borderRadius: '10px', 
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                maxHeight: '150px'
              }} 
            />
          </div>
        )}
        
        <button 
          onClick={handleFindLocation} 
          disabled={loading}
          style={{ 
            padding: '0.8rem 1.8rem', 
            fontSize: '1.1rem', 
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#cccccc' : '#4BB462',
            color: 'white',
            border: 'none',
            borderRadius: '30px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            fontWeight: '600',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
            outline: 'none',
            width: '100%',
            opacity: loading ? 0.7 : 1,
            marginBottom: '1rem'
          }}
        >
          {loading ? 'Finding Location...' : 'Get My Current Location'}
        </button>

        {!location && !loading && !error && (
          <div style={{
            textAlign: 'center',
            padding: '1rem',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #bbdefb'
          }}>
            <p style={{ margin: '0', color: '#1976d2', fontSize: '14px' }}>
              📍 Click the button above to automatically detect your current location, or manually enter coordinates below.
            </p>
          </div>
        )}
        
        {location && editedLocation && (
          <div style={{ 
            marginTop: '2rem',
            background: '#FFFAF0',
            padding: '1.5rem 2rem',
            borderRadius: '10px',
            width: '100%',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
            border: '1px solid #FFE4B5',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}>
              <label style={{ 
                fontWeight: '600', 
                fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                marginRight: '10px',
                color: '#333'
              }}>
                Latitude:
              </label> 
              <input
                type="text"
                value={editedLocation.lat}
                onChange={(e) => handleInputChange(e, 'lat')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  width: '160px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  textAlign: 'right'
                }}
              />
            </div>
            
            <div style={{ 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}>
              <label style={{ 
                fontWeight: '600', 
                fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                marginRight: '10px',
                color: '#333' 
              }}>
                Longitude:
              </label>
              <input
                type="text"
                value={editedLocation.lng}
                onChange={(e) => handleInputChange(e, 'lng')}
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  width: '160px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  textAlign: 'right'
                }}
              />
            </div>
            
            <div style={{ 
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}>
              <label style={{ 
                fontWeight: '600', 
                fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                marginRight: '10px',
                color: '#333' 
              }}>
                Pincode:
              </label>
              <input
                type="text"
                value={pincode}
                onChange={handlePincodeChange}
                style={{
                  padding: '0.5rem',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  width: '160px',
                  fontSize: 'clamp(0.9rem, 2vw, 1rem)',
                  textAlign: 'right'
                }}
                maxLength={6}
                placeholder="Enter pincode"
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '0.6rem 0',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '20px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  width: '40%'
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                style={{
                  padding: '0.6rem 0',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  background: saved ? '#4BB462' : '#fdb813',
                  color: 'white',
                  border: 'none',
                  borderRadius: '20px',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  width: '60%'
                }}
              >
                {saved ? 'Saved!' : (userType === 'worker' ? 'Update My Location' : 'Confirm & Submit')}
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ 
            marginTop: '2rem',
            background: 'rgba(255, 70, 70, 0.9)',
            padding: '1rem 1.5rem',
            borderRadius: '10px',
            color: '#fff',
            fontWeight: '500',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
            animation: 'fadeIn 0.5s ease-out'
          }}>{error}</div>
        )}
      </div>
      
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
    </div>
  );
};

export default LocationCapture;
