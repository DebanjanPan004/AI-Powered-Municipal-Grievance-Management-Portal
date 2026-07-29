import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SubmitGrievance = ({ user }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [detectedCategory, setDetectedCategory] = useState('');
  const [rawDetection, setRawDetection] = useState('');
  const [classificationConfidence, setClassificationConfidence] = useState(0);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: form, 2: location
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);
  const [showMap, setShowMap] = useState(false);
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
  }, []);
  
  // Auto-fill function for title and description based on detected issue
  const autoFillFormBasedOnDetection = (detection) => {
    if (!detection) return;
    
    const detectionLower = detection.toLowerCase();
    
    // Define auto-fill content based on detection
    // Note: Title and Description are swapped in the UI, so we're setting them in reverse
    if (detectionLower.includes('pothole')) {
      setDescription('Pothole issue');
      setTitle('There is a pothole issue in my location, please find the attached photo for reference');
    } 
    else if (detectionLower.includes('fallen tree') || detectionLower.includes('fallentree')) {
      setDescription('Fallen tree issue');
      setTitle('There is a fallen tree issue in my location, please find the attached photo for reference');
    }
    else if (detectionLower.includes('water logging') || detectionLower.includes('waterlogging')) {
      setDescription('Water logging issue');
      setTitle('There is a water logging issue in my location, please find the attached photo for reference');
    }
    else if (detectionLower.includes('garbage overflow') || detectionLower.includes('garbageoverflow')) {
      setDescription('Garbage overflow issue');
      setTitle('There is a garbage overflow issue in my location, please find the attached photo for reference');
    }
  };

  // Category mapping reference (for displaying human-readable categories)
  const categoryNames = {
    'Roads': 'Roads',
    'Drainage': 'Drainage',
    'Waste Management': 'Waste Management',
    'Street Lights': 'Street Lights',
    'Water Supply': 'Water Supply',
    'Electricity': 'Electricity',
    'Public Property': 'Public Property',
    'Others': 'Others'
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      // Log file information
      console.log('File selected:', file.name, file.type, file.size);
      
      setImage(file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Auto-classify the image
      await classifyImage(file);
    }
  };
  
  const classifyImage = async (imageFile) => {
    if (!user || !user.token) {
      setError('Authentication error: No valid token found. Please login again.');
      navigate('/login');
      return;
    }
    
    setClassifying(true);
    setError('');
    
    try {
      // Create a new File object with explicit MIME type
      const fileExtension = imageFile.name.split('.').pop().toLowerCase();
      const mimeType = fileExtension === 'png' ? 'image/png' : 
                      fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';
      
      // Create a new file with explicit MIME type
      const properImageFile = new File(
        [imageFile], 
        imageFile.name, 
        { type: mimeType }
      );
      
      const formData = new FormData();
      formData.append('image', properImageFile);
      
      // Log information about the file being sent
      console.log('Sending file for classification:', properImageFile.name, properImageFile.type, properImageFile.size);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/classifier/classify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
      
      console.log('Classification response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Classification failed');
      }
      
      const data = await response.json();
      
      // Set the detected category
      setRawDetection(data.rawPrediction);
      setDetectedCategory(data.rawPrediction);
      setCategory(data.category);
      setClassificationConfidence(data.confidence);
      
      console.log('Image classified as:', data.rawPrediction);
      console.log('Mapped to category:', data.category);
      console.log('Confidence:', data.confidence);
      
      // Auto-fill title and description based on detected issue
      autoFillFormBasedOnDetection(data.rawPrediction);
    } catch (error) {
      console.error('Error classifying image:', error);
      setError(`Failed to classify image: ${error.message}`);
      setCategory('Others'); // Default to Others if classification fails
    } finally {
      setClassifying(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!title || !description || !image) {
      setError('Please fill all required fields including title, description and upload an image');
      return;
    }
    
    if (!category) {
      setError('Please wait for image classification to complete or try uploading the image again');
      return;
    }
    
    // Move to location capture step
    setStep(2);
  };

  const handleGetLocation = () => {
    setLocationLoading(true);
    setError('');
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setCurrentLocation(newLocation);
        setShowMap(true);
        setLocationLoading(false);
        
        // Get readable address from coordinates using reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.lat}&lon=${newLocation.lng}&zoom=18&addressdetails=1`
          );
          const data = await response.json();
          const locationName = data.display_name || `Lat: ${newLocation.lat.toFixed(6)}, Lng: ${newLocation.lng.toFixed(6)}`;
          
          // Initialize map with GPS coordinates and location name
          setTimeout(() => initializeMapWithGPS(newLocation, locationName), 100);
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          // Fallback to coordinates if reverse geocoding fails
          const fallbackName = `Lat: ${newLocation.lat.toFixed(6)}, Lng: ${newLocation.lng.toFixed(6)}`;
          setTimeout(() => initializeMapWithGPS(newLocation, fallbackName), 100);
        }
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
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleLocationInputChange = (e, field) => {
    const value = e.target.value;
    // Allow only numbers, period and negative sign for coordinates
    if (/^-?\d*\.?\d*$/.test(value) || value === '') {
      const newLocation = {
        ...currentLocation,
        [field]: value === '' ? '' : parseFloat(value)
      };
      setCurrentLocation(newLocation);
      
      // Update map marker position if map exists and coordinates are valid
      if (map && marker && !isNaN(newLocation.lat) && !isNaN(newLocation.lng)) {
        const newLatLng = window.L.latLng(newLocation.lat, newLocation.lng);
        marker.setLatLng(newLatLng);
        map.setView(newLatLng, map.getZoom());
        marker.bindPopup(`
          <div style="color: #333; font-size: 14px;">
            <strong>Manual Coordinates:</strong><br/>
            Lat: ${newLocation.lat}, Lng: ${newLocation.lng}
          </div>
        `).openPopup();
      }
    }
  };

  // Function to convert address to coordinates using geocoding
  const handleAddressToCoordinates = async () => {
    if (!addressInput.trim()) {
      setError('Please enter an address or location');
      return;
    }

    setAddressLoading(true);
    setError('');

    try {
      // Using OpenStreetMap Nominatim API for geocoding (free and no API key required)
      const encodedAddress = encodeURIComponent(addressInput.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=in`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        const coordinates = {
          lat: parseFloat(parseFloat(location.lat).toFixed(6)),
          lng: parseFloat(parseFloat(location.lon).toFixed(6))
        };
        
        setCurrentLocation(coordinates);
        setShowMap(true);
        setError('');
        
        // Initialize map after coordinates are set
        setTimeout(() => initializeMapWithAddress(coordinates, location.display_name), 100);
      } else {
        setError('Location not found. Please try a more specific address or use a nearby landmark.');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to find location. Please check your address and try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  // Initialize map with address coordinates
  const initializeMapWithAddress = (coordinates, displayName) => {
    // Wait for Leaflet to load
    if (typeof window.L === 'undefined') {
      setTimeout(() => initializeMapWithAddress(coordinates, displayName), 100);
      return;
    }

    const mapContainer = document.getElementById('address-map');
    if (!mapContainer) return;

    // Clear existing map if any
    if (map) {
      map.remove();
    }

    // Create map centered on the found coordinates
    const newMap = window.L.map('address-map').setView([coordinates.lat, coordinates.lng], 15);
    
    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    // Create custom marker icon
    const customIcon = window.L.divIcon({
      className: 'custom-map-marker',
      html: '<i class="fas fa-map-marker-alt" style="color: #00ff87; font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    // Add marker at the found location
    const newMarker = window.L.marker([coordinates.lat, coordinates.lng], { 
      icon: customIcon,
      draggable: true
    }).addTo(newMap);

    // Add popup with address information
    newMarker.bindPopup(`
      <div style="color: #333; font-size: 14px;">
        <strong>Found Location:</strong><br/>
        ${displayName}<br/>
        <small>Lat: ${coordinates.lat}, Lng: ${coordinates.lng}</small>
      </div>
    `).openPopup();

    // Handle map clicks to update location
    newMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      newMarker.setLatLng([lat, lng]);
      setCurrentLocation({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      });
      newMarker.bindPopup(`
        <div style="color: #333; font-size: 14px;">
          <strong>Selected Location:</strong><br/>
          Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}
        </div>
      `).openPopup();
    });

    // Handle marker drag
    newMarker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      const newCoords = {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      };
      setCurrentLocation(newCoords);
      newMarker.bindPopup(`
        <div style="color: #333; font-size: 14px;">
          <strong>Adjusted Location:</strong><br/>
          Lat: ${newCoords.lat}, Lng: ${newCoords.lng}
        </div>
      `).openPopup();
    });

    setMap(newMap);
    setMarker(newMarker);
  };

  // Effect to initialize map when step becomes 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(initializeMap, 100);
    }
  }, [step, currentLocation]);

  // Initialize map when step changes to location capture
  const initializeMap = () => {
    // Wait for Leaflet to load
    if (typeof window.L === 'undefined') {
      setTimeout(initializeMap, 100);
      return;
    }

    const mapContainer = document.getElementById('location-map');
    if (!mapContainer || mapContainer.innerHTML.trim() !== '') return;

    // Create map centered on India with default coordinates
    const defaultLat = currentLocation?.lat || 20.5937;
    const defaultLng = currentLocation?.lng || 78.9629;
    
    const newMap = window.L.map('location-map').setView([defaultLat, defaultLng], 13);
    
    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    // Create custom marker icon
    const customIcon = window.L.divIcon({
      className: 'custom-map-marker',
      html: '<i class="fas fa-map-marker-alt" style="color: #00ff87; font-size: 24px;"></i>',
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    });

    // Add marker
    const newMarker = window.L.marker([defaultLat, defaultLng], { 
      icon: customIcon,
      draggable: true
    }).addTo(newMap);

    // Handle map clicks
    newMap.on('click', (e) => {
      const { lat, lng } = e.latlng;
      newMarker.setLatLng([lat, lng]);
      setCurrentLocation({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      });
    });

    // Handle marker drag
    newMarker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      setCurrentLocation({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      });
    });

    setMap(newMap);
    setMarker(newMarker);
  };

  // Initialize map with GPS coordinates
  const initializeMapWithGPS = (coordinates, locationName = null) => {
    // Wait for Leaflet to load
    if (typeof window.L === 'undefined') {
      setTimeout(() => initializeMapWithGPS(coordinates, locationName), 100);
      return;
    }

    const mapContainer = document.getElementById('address-map');
    if (!mapContainer) return;

    // Clear existing map if any
    if (map) {
      map.remove();
    }

    // Create map centered on the GPS coordinates
    const newMap = window.L.map('address-map').setView([coordinates.lat, coordinates.lng], 15);
    
    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(newMap);

    // Create custom marker icon
    const customIcon = window.L.divIcon({
      className: 'custom-map-marker',
      html: '<i class="fas fa-map-marker-alt" style="color: #00ff87; font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></i>',
      iconSize: [28, 28],
      iconAnchor: [14, 28]
    });

    // Add marker at the GPS location
    const newMarker = window.L.marker([coordinates.lat, coordinates.lng], { 
      icon: customIcon,
      draggable: true
    }).addTo(newMap);

    // Create popup content with location name or coordinates
    const popupContent = locationName 
      ? `<div style="color: #333; font-size: 14px; max-width: 250px;">
           <strong>Your Current Location:</strong><br/>
           ${locationName}<br/>
           <small>Lat: ${coordinates.lat.toFixed(6)}, Lng: ${coordinates.lng.toFixed(6)}</small>
         </div>`
      : `<div style="color: #333; font-size: 14px;">
           <strong>Your Current Location:</strong><br/>
           GPS Detected Position<br/>
           <small>Lat: ${coordinates.lat.toFixed(6)}, Lng: ${coordinates.lng.toFixed(6)}</small>
         </div>`;

    // Add popup with GPS information
    newMarker.bindPopup(popupContent).openPopup();

    // Handle map clicks to update location
    newMap.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      newMarker.setLatLng([lat, lng]);
      setCurrentLocation({
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      });
      
      // Try to get address for clicked location
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        const clickedLocationName = data.display_name || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
        
        newMarker.bindPopup(`
          <div style="color: #333; font-size: 14px; max-width: 250px;">
            <strong>Selected Location:</strong><br/>
            ${clickedLocationName}<br/>
            <small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>
          </div>
        `).openPopup();
      } catch (err) {
        newMarker.bindPopup(`
          <div style="color: #333; font-size: 14px;">
            <strong>Selected Location:</strong><br/>
            Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}
          </div>
        `).openPopup();
      }
    });

    // Handle marker drag
    newMarker.on('dragend', async (e) => {
      const { lat, lng } = e.target.getLatLng();
      const newCoords = {
        lat: parseFloat(lat.toFixed(6)),
        lng: parseFloat(lng.toFixed(6))
      };
      setCurrentLocation(newCoords);
      
      // Try to get address for dragged location
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        const data = await response.json();
        const draggedLocationName = data.display_name || `Lat: ${newCoords.lat}, Lng: ${newCoords.lng}`;
        
        newMarker.bindPopup(`
          <div style="color: #333; font-size: 14px; max-width: 250px;">
            <strong>Adjusted Location:</strong><br/>
            ${draggedLocationName}<br/>
            <small>Lat: ${newCoords.lat}, Lng: ${newCoords.lng}</small>
          </div>
        `).openPopup();
      } catch (err) {
        newMarker.bindPopup(`
          <div style="color: #333; font-size: 14px;">
            <strong>Adjusted Location:</strong><br/>
            Lat: ${newCoords.lat}, Lng: ${newCoords.lng}
          </div>
        `).openPopup();
      }
    });

    setMap(newMap);
    setMarker(newMarker);
  };

  const handleSubmitGrievance = async () => {
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

    // Debug: Check user and token
    console.log('User object:', user);
    console.log('User token:', user?.token);
    
    if (!user || !user.token) {
      setError('Authentication error: No valid token found. Please login again.');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get address information based on coordinates
      let address = `Coordinates: ${currentLocation.lat}, ${currentLocation.lng}`;
      
      try {
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
        }
      } catch (geocodeErr) {
        console.warn('Could not retrieve address from coordinates:', geocodeErr);
      }

      // Create form data for multipart upload
      const formData = new FormData();
      formData.append('image', image);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('latitude', currentLocation.lat);
      formData.append('longitude', currentLocation.lng);
      formData.append('address', address);
      
      console.log('Submitting grievance with data:', {
        title,
        category,
        description,
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
        address,
        imageFileName: image.name
      });
      
      // Submit the grievance
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log('Success response:', responseData);
      
      // Navigate back to dashboard with success message
      navigate('/citizen/dashboard', { 
        state: { 
          grievanceSubmitted: true,
          message: 'Your grievance has been submitted successfully!'
        }
      });
      
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to submit grievance');
    } finally {
      setLoading(false);
    }
  };

  // Animation style for loading spinner and map marker
  const spinStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .custom-map-marker {
      background: transparent;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .custom-map-marker i {
      transition: all 0.3s ease;
    }
    
    .custom-map-marker:hover i {
      transform: scale(1.1);
    }
  `;

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%',
      display: 'flex', 
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0a0b0d 0%, #1a1b1f 100%)',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '700px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '20px',
        padding: '40px',
        border: '1px solid rgba(0, 255, 135, 0.2)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        margin: '20px'
      }}>
        {/* Add the animation style */}
        <style dangerouslySetInnerHTML={{ __html: spinStyle }} />

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '16px' }}>
            <i className="fas fa-file-alt" style={{ 
              fontSize: '32px', 
              color: '#00ff87', 
              marginBottom: '12px' 
            }}></i>
          </div>
          <h2 style={{ 
            fontSize: '32px', 
            color: '#ffffff', 
            marginBottom: '12px',
            fontWeight: '700'
          }}>
            {step === 1 ? 'Submit New Grievance' : 'Capture Location'}
          </h2>
          <p style={{ 
            color: '#a0a9b8',
            fontSize: '16px',
            lineHeight: '1.5'
          }}>
            {step === 1 ? 'Upload a photo and provide details about the issue' : 'Please provide the location where the issue occurred'}
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '16px', 
            background: 'rgba(244, 67, 54, 0.1)',
            border: '1px solid rgba(244, 67, 54, 0.3)',
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ 
              color: '#ff6b6b', 
              marginRight: '8px' 
            }}></i>
            <span style={{ color: '#ff6b6b', fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600',
              color: '#ffffff',
              fontSize: '16px'
            }}>
              <i className="fas fa-camera" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Upload Photo
            </label>
            
            <div style={{ 
              border: '2px dashed rgba(0, 255, 135, 0.3)', 
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.02)',
              transition: 'all 0.3s ease'
            }} 
            onClick={() => document.getElementById('image-upload').click()}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#00ff87';
              e.target.style.background = 'rgba(0, 255, 135, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(0, 255, 135, 0.3)';
              e.target.style.background = 'rgba(255, 255, 255, 0.02)';
            }}>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
              {imagePreview ? (
                <div>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '2px solid rgba(0, 255, 135, 0.3)'
                    }} 
                  />
                  <p style={{ margin: '12px 0 0', color: '#00ff87', fontSize: '14px', fontWeight: '500' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
                    Image uploaded successfully
                  </p>
                </div>
              ) : (
                <div>
                  <i className="fas fa-cloud-upload-alt" style={{ 
                    fontSize: '48px', 
                    color: '#00ff87', 
                    marginBottom: '16px' 
                  }}></i>
                  <p style={{ margin: '0', color: '#ffffff', fontSize: '16px', fontWeight: '500' }}>
                    Click or drag and drop to upload image
                  </p>
                  <p style={{ margin: '8px 0 0', color: '#a0a9b8', fontSize: '14px' }}>
                    Max size: 5MB • Supported: JPG, PNG, GIF
                  </p>
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600',
              color: '#ffffff',
              fontSize: '16px'
            }}>
              <i className="fas fa-robot" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Auto-Detected Issue
            </label>
            {classifying ? (
              <div style={{ 
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <i className="fas fa-spinner fa-spin" style={{ color: '#00ff87', fontSize: '18px' }}></i>
                <span style={{ color: '#a0a9b8' }}>Analyzing image...</span>
              </div>
            ) : rawDetection ? (
              <div style={{
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 135, 0.3)',
                background: 'rgba(0, 255, 135, 0.1)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{ fontWeight: '600', color: '#ffffff' }}>
                  <i className="fas fa-check-circle" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                  Detected: <span style={{ color: '#00ff87' }}>{rawDetection}</span>
                  <span style={{ marginLeft: '12px', fontSize: '14px', color: '#a0a9b8' }}>
                    ({classificationConfidence.toFixed(1)}% confident)
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ 
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px dashed rgba(0, 255, 135, 0.3)',
                color: '#a0a9b8',
                background: 'rgba(255, 255, 255, 0.02)',
                textAlign: 'center'
              }}>
                <i className="fas fa-upload" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                Upload an image to automatically detect the issue type
              </div>
            )}
          </div>

          {(rawDetection || classifying) && (
            <div style={{ 
              marginBottom: '24px',
              padding: '12px 16px',
              background: 'rgba(0, 255, 135, 0.05)',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p style={{ 
                margin: '0',
                color: '#a0a9b8',
                fontSize: '14px',
                fontStyle: 'italic'
              }}>
                <i className="fas fa-edit" style={{ marginRight: '6px', color: '#00ff87' }}></i>
                You can edit the title and description if needed
              </p>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600',
              color: '#ffffff',
              fontSize: '16px'
            }}>
              <i className="fas fa-heading" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Title
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a brief Title"
              required
              rows={1}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                resize: 'vertical',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00ff87';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 135, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '12px', 
              fontWeight: '600',
              color: '#ffffff',
              fontSize: '16px'
            }}>
              <i className="fas fa-align-left" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Description
            </label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a brief description for the issue"
              required
              rows={4}
              style={{
                width: '100%',
                padding: '16px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                fontSize: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#00ff87';
                e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 135, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/citizen/dashboard')}
              style={{
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#a0a9b8',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '30%',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = '#ffffff';
                e.target.style.borderColor = 'rgba(0, 255, 135, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                e.target.style.color = '#a0a9b8';
                e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
              }}
            >
              <i className="fas fa-arrow-left" style={{ marginRight: '8px' }}></i>
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px',
                background: loading 
                  ? 'rgba(0, 255, 135, 0.5)' 
                  : 'linear-gradient(135deg, #00ff87, #00d96f)',
                color: '#0a0b0d',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '70%',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-arrow-right"></i>
                  Next: Capture Location
                </>
              )}
            </button>
          </div>
        </form>
        ) : (
          // Step 2: Location Capture
          <div>
            {imagePreview && (
              <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                <p style={{ 
                  marginBottom: '12px', 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#ffffff'
                }}>
                  <i className="fas fa-image" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                  Your uploaded image:
                </p>
                <img 
                  src={imagePreview} 
                  alt="Grievance" 
                  style={{ 
                    maxWidth: '100%', 
                    borderRadius: '12px', 
                    border: '2px solid rgba(0, 255, 135, 0.3)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                    maxHeight: '150px'
                  }} 
                />
              </div>
            )}
            
            <button 
              onClick={handleGetLocation} 
              disabled={locationLoading}
              style={{ 
                padding: '18px 24px', 
                fontSize: '16px', 
                cursor: locationLoading ? 'not-allowed' : 'pointer',
                background: locationLoading 
                  ? 'rgba(0, 255, 135, 0.5)' 
                  : 'linear-gradient(135deg, #00ff87, #00d96f)',
                color: '#0a0b0d',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                transition: 'all 0.3s ease',
                outline: 'none',
                width: '100%',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => {
                if (!locationLoading) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!locationLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {locationLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Finding Location...
                </>
              ) : (
                <>
                  <i className="fas fa-map-marker-alt"></i>
                  Get My Current Location
                </>
              )}
            </button>

            {/* Address Input Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '12px', 
                fontWeight: '600',
                color: '#ffffff',
                fontSize: '16px'
              }}>
                <i className="fas fa-map-marker-alt" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                Choose Address Instead
              </label>
              
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                marginBottom: '20px'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Enter address, landmark, or area name (e.g., 'MG Road Bangalore', 'India Gate Delhi')"
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 135, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      fontSize: '16px',
                      transition: 'all 0.3s ease',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00ff87';
                      e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 135, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddressToCoordinates();
                      }
                    }}
                  />
                </div>
                
                <button
                  onClick={handleAddressToCoordinates}
                  disabled={addressLoading || !addressInput.trim()}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: addressLoading || !addressInput.trim()
                      ? 'rgba(0, 255, 135, 0.3)'
                      : 'linear-gradient(135deg, #00ff87, #00d96f)',
                    color: addressLoading || !addressInput.trim() ? '#a0a9b8' : '#0a0b0d',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: addressLoading || !addressInput.trim() ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    marginBottom: showMap ? '16px' : '0'
                  }}
                  onMouseEnter={(e) => {
                    if (!addressLoading && addressInput.trim()) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0, 255, 135, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!addressLoading && addressInput.trim()) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {addressLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Finding Location...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-search-location"></i>
                      Get Coordinates from Address
                    </>
                  )}
                </button>

                {/* Map Container - shows after address is found */}
                {showMap && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ 
                        color: '#00ff87', 
                        fontSize: '14px', 
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <i className="fas fa-map"></i>
                        Location Found on Map
                      </span>
                      <button
                        onClick={() => setShowMap(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '6px',
                          color: '#a0a9b8',
                          padding: '4px 8px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <i className="fas fa-times"></i> Hide Map
                      </button>
                    </div>
                    
                    <div id="address-map" style={{
                      height: '250px',
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 135, 0.3)',
                      background: 'rgba(255, 255, 255, 0.02)'
                    }}></div>
                    
                    <p style={{ 
                      margin: '8px 0 0', 
                      color: '#a0a9b8', 
                      fontSize: '12px',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      <i className="fas fa-hand-pointer" style={{ marginRight: '4px', color: '#00ff87' }}></i>
                      Click on map to adjust location or drag the marker to fine-tune position
                    </p>
                  </div>
                )}
                
                {!showMap && (
                  <p style={{ 
                    margin: '12px 0 0', 
                    color: '#a0a9b8', 
                    fontSize: '13px',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#00ff87' }}></i>
                    Enter any recognizable address, landmark, or area name to get precise coordinates
                  </p>
                )}
              </div>
            </div>

            {(!currentLocation && !locationLoading && !error) && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                borderRadius: '12px',
                marginBottom: '20px',
                backdropFilter: 'blur(10px)'
              }}>
                <i className="fas fa-info-circle" style={{ 
                  fontSize: '24px', 
                  color: '#2196f3', 
                  marginBottom: '8px' 
                }}></i>
                <p style={{ margin: '0', color: '#64b5f6', fontSize: '14px', fontWeight: '500' }}>
                  Click the button above to detect your location, enter an address to find coordinates, or manually enter coordinates below.
                </p>
              </div>
            )}

            {currentLocation && (
              <div style={{ 
                marginTop: '24px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                padding: '24px',
                borderRadius: '15px',
                width: '100%',
                border: '1px solid rgba(0, 255, 135, 0.2)',
                boxSizing: 'border-box'
              }}>
                <div style={{ 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ 
                    fontWeight: '600', 
                    fontSize: '16px',
                    marginRight: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-globe" style={{ color: '#00ff87' }}></i>
                    Latitude:
                  </label> 
                  <input
                    type="text"
                    value={currentLocation.lat}
                    onChange={(e) => handleLocationInputChange(e, 'lat')}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 135, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      width: '180px',
                      fontSize: '14px',
                      textAlign: 'right',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00ff87';
                      e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 135, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                
                <div style={{ 
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap'
                }}>
                  <label style={{ 
                    fontWeight: '600', 
                    fontSize: '16px',
                    marginRight: '12px',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <i className="fas fa-compass" style={{ color: '#00ff87' }}></i>
                    Longitude:
                  </label>
                  <input
                    type="text"
                    value={currentLocation.lng}
                    onChange={(e) => handleLocationInputChange(e, 'lng')}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 135, 0.2)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#ffffff',
                      width: '180px',
                      fontSize: '14px',
                      textAlign: 'right',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#00ff87';
                      e.target.style.boxShadow = '0 0 0 2px rgba(0, 255, 135, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  gap: '16px'
                }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: '16px',
                      fontSize: '16px',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: '#a0a9b8',
                      border: '1px solid rgba(0, 255, 135, 0.2)',
                      borderRadius: '12px',
                      fontWeight: '600',
                      width: '30%',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.color = '#ffffff';
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.color = '#a0a9b8';
                      e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                    }}
                  >
                    <i className="fas fa-arrow-left"></i>
                    Back
                  </button>
                  
                  <button
                    onClick={handleSubmitGrievance}
                    disabled={loading}
                    style={{
                      padding: '16px',
                      fontSize: '16px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      background: loading 
                        ? 'rgba(0, 255, 135, 0.5)' 
                        : 'linear-gradient(135deg, #00ff87, #00d96f)',
                      color: '#0a0b0d',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      width: '70%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 135, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        Submit Grievance
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmitGrievance;
