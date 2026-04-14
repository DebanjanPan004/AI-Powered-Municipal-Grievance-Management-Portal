import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MyGrievances = ({ user }) => {
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchGrievances();
  }, []);
  
  const fetchGrievances = async () => {
    try {
      if (!user || !user.token) {
        console.error('No auth token available');
        setError('Authentication error. Please login again.');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/citizen`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const formattedGrievances = data.grievances.map(g => ({
          id: g.grievance_id,
          title: g.description.substring(0, 30) + (g.description.length > 30 ? '...' : ''),
          category: g.category || 'General',
          status: g.status,
          dateSubmitted: new Date(g.created_at).toISOString().split('T')[0],
          latitude: g.latitude,
          longitude: g.longitude,
          image_path: g.image_path
        }));
        
        setGrievances(formattedGrievances);
        setLoading(false);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch grievances:', errorText);
        
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        
        setError('Failed to load grievances. Please try again later.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching grievances:', err);
      setError('Failed to connect to the server. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handleImageClick = (imagePath) => {
    setSelectedImage(imagePath);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p>Loading grievances...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        borderRadius: '10px',
        marginBottom: '20px'
      }}>
        <p style={{ margin: '0' }}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {grievances.length > 0 ? (
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Table Header */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr',
            padding: '15px 20px',
            backgroundColor: '#f9f9f9',
            borderBottom: '1px solid #eee',
            fontWeight: '600',
            color: '#555'
          }}>
            <div>ID</div>
            <div>Image</div>
            <div>Title</div>
            <div>Category</div>
            <div>Status</div>
            <div>Date</div>
            <div>Coordinates</div>
          </div>
          
          {/* Table Body */}
          {grievances.map((grievance) => (
            <div 
              key={grievance.id}
              style={{ 
                display: 'grid',
                gridTemplateColumns: '50px 80px 2fr 1fr 1fr 1fr 1fr',
                padding: '15px 20px',
                borderBottom: '1px solid #eee',
                alignItems: 'center',
                transition: 'background-color 0.2s',
                cursor: 'pointer',
                color: '#333'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div>{grievance.id}</div>
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
                <span style={{ display: 'none', fontSize: '12px', color: '#999' }}>No image</span>
              </div>
              <div style={{ fontWeight: '500' }}>{grievance.title}</div>
              <div>{grievance.category}</div>
              <div>{getStatusBadge(grievance.status)}</div>
              <div>{grievance.dateSubmitted}</div>
              <div>
                {grievance.latitude !== undefined && grievance.longitude !== undefined ? 
                  `${typeof grievance.latitude === 'number' ? grievance.latitude.toFixed(6) : parseFloat(grievance.latitude).toFixed(6)}, 
                   ${typeof grievance.longitude === 'number' ? grievance.longitude.toFixed(6) : parseFloat(grievance.longitude).toFixed(6)}` 
                  : 'No coordinates'
                }
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
        }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            You haven't submitted any grievances yet.
          </p>
          <button 
            onClick={() => navigate('/citizen/submit-grievance')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4BB462',
              color: 'white',
              borderRadius: '30px',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Submit Your First Grievance
          </button>
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
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
                borderRadius: '8px'
              }}
            />
            <button
              onClick={closeImageModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyGrievances;