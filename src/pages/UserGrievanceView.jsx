import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';

const UserGrievanceView = ({ user }) => {
  const [grievances, setGrievances] = useState([]);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const navigate = useNavigate();
  const { userId } = useParams();
  
  useEffect(() => {
    // Verify the user is admin or worker
    if (user?.role !== 'admin' && user?.role !== 'worker') {
      navigate('/login');
      return;
    }
    
    // Fetch grievances for the specified user
    fetchUserGrievances();
  }, [userId]);
  
  const fetchUserGrievances = async () => {
    try {
      // Check if user token exists
      if (!user || !user.token) {
        console.error('No auth token available');
        setError('Authentication error. Please login again.');
        localStorage.removeItem('user'); // Clear invalid session
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/grievances/user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set user data
        setUserData(data.user);
        
        // Format the grievances data for display
        const formattedGrievances = data.grievances.map(g => ({
          id: g.grievance_id,
          title: g.description.substring(0, 30) + (g.description.length > 30 ? '...' : ''),
          description: g.description,
          category: g.category || 'General',
          status: g.status,
          dateSubmitted: new Date(g.created_at).toLocaleDateString(),
          latitude: g.latitude,
          longitude: g.longitude,
          address: g.address || 'No address provided',
          image_path: g.image_path
        }));
        
        setGrievances(formattedGrievances);
        setLoading(false);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch user grievances:', errorText);
        
        // Handle unauthorized error
        if (response.status === 401 || response.status === 403) {
          setError('Authentication error. Please login again.');
          localStorage.removeItem('user'); // Clear invalid session
          navigate('/login');
          return;
        }
        
        setError('Failed to load user grievances. Please try again later.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching user grievances:', err);
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

  const handleBack = () => {
    navigate(-1); // Go back to the previous page
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <header style={{ 
        backgroundColor: '#fdb813',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={{ 
            margin: 0, 
            color: '#333',
            fontSize: '24px'
          }}>
            Grievance Portal
          </h1>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: '20px', textAlign: 'right' }}>
            <p style={{ margin: '0', color: '#333', fontWeight: '600' }}>
              {user?.name || 'User'}
            </p>
            <p style={{ margin: '0', color: '#555', fontSize: '14px' }}>
              {user?.role === 'admin' ? 'Administrator' : 'Worker'}
            </p>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 15px',
              backgroundColor: '#fff',
              color: '#333',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}
          >
            Logout
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <main style={{ padding: '30px 20px' }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <button
              onClick={handleBack}
              style={{
                padding: '8px 15px',
                backgroundColor: '#fff',
                color: '#333',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              &larr; Back
            </button>
          </div>
          
          {/* User Info Card */}
          {userData && (
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>
                User Information
              </h2>
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                <strong>User ID:</strong> {userData.userId}
              </p>
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                <strong>Username:</strong> {userData.username}
              </p>
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                <strong>Full Name:</strong> {userData.fullName}
              </p>
              <p style={{ margin: '5px 0', fontSize: '16px' }}>
                <strong>Total Grievances:</strong> {grievances.length}
              </p>
            </div>
          )}
          
          {/* Grievances Section */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>
              User Grievances
            </h2>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p>Loading grievances...</p>
              </div>
            ) : error ? (
              <div style={{ 
                padding: '20px',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                borderRadius: '10px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: '0' }}>{error}</p>
              </div>
            ) : grievances.length > 0 ? (
              <div style={{ 
                backgroundColor: 'white',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)'
              }}>
                {/* Table Header */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr',
                  padding: '15px 20px',
                  backgroundColor: '#f9f9f9',
                  borderBottom: '1px solid #eee',
                  fontWeight: '600',
                  color: '#555'
                }}>
                  <div>Image</div>
                  <div>Description</div>
                  <div>Category</div>
                  <div>Status</div>
                  <div>Date</div>
                  <div>Location</div>
                </div>
                
                {/* Table Body */}
                {grievances.map((grievance) => (
                  <div 
                    key={grievance.id}
                    style={{ 
                      display: 'grid',
                      gridTemplateColumns: '80px 2fr 1fr 1fr 1fr 1fr',
                      padding: '15px 20px',
                      borderBottom: '1px solid #eee',
                      alignItems: 'center',
                      transition: 'background-color 0.2s',
                      color: '#333'
                    }}
                  >
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
                    <div style={{ fontWeight: '500' }}>{grievance.description}</div>
                    <div>{grievance.category}</div>
                    <div>{getStatusBadge(grievance.status)}</div>
                    <div>{grievance.dateSubmitted}</div>
                    <div>
                      {grievance.address}
                      <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
                        {grievance.latitude !== undefined && grievance.longitude !== undefined ? 
                          `${typeof grievance.latitude === 'number' ? grievance.latitude.toFixed(6) : parseFloat(grievance.latitude).toFixed(6)}, 
                          ${typeof grievance.longitude === 'number' ? grievance.longitude.toFixed(6) : parseFloat(grievance.longitude).toFixed(6)}` 
                          : 'No coordinates'
                        }
                      </div>
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
                <p style={{ color: '#666' }}>
                  This user has not submitted any grievances yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer style={{ 
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        borderTop: '1px solid #eee',
        marginTop: 'auto'
      }}>
        <p>© 2023 Municipal Grievance Portal. All rights reserved.</p>
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

export default UserGrievanceView;