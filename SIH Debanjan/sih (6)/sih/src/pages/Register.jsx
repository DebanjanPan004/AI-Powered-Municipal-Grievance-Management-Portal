import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = ({ setUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'citizen',
    departmentId: ''
  });
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(false);
  const navigate = useNavigate();
  
  // Load FontAwesome for icons
  useEffect(() => {
    if (!document.getElementById('fa-cdn')) {
      const link = document.createElement('link');
      link.id = 'fa-cdn';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      document.head.appendChild(link);
    }

    // Add Google Fonts
    if (!document.getElementById('google-fonts')) {
      const link = document.createElement('link');
      link.id = 'google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);
  
  // Fetch departments when role changes to worker
  useEffect(() => {
    if (formData.role === 'municipal_worker') {
      fetchDepartments();
    }
  }, [formData.role]);
  
  // Function to fetch departments from API
  const fetchDepartments = async () => {
    setLoadingDepts(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/departments`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      const data = await response.json();
      setDepartments(data.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
      setError('Failed to load departments. Please try again.');
    } finally {
      setLoadingDepts(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email');
      return false;
    }
    
    // Email domain validation for admin and worker roles
    if (formData.role === 'municipal_admin' && !formData.email.endsWith('@muni.in')) {
      setError('Municipal Admin registration requires an email ending with @muni.in');
      return false;
    }
    
    if (formData.role === 'municipal_worker' && !formData.email.endsWith('@work.in')) {
      setError('Municipal Worker registration requires an email ending with @work.in');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    // Validate role-specific fields
    if (formData.role === 'municipal_worker' && !formData.departmentId) {
      setError('Please select a department');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare request body - only include departmentId for workers
      const requestBody = {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        role: formData.role
      };
      
      // Only include departmentId for workers
      if (formData.role === 'municipal_worker') {
        requestBody.departmentId = formData.departmentId;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Registration successful
      const userData = {
        id: data.userId,
        username: formData.username,
        role: formData.role,
        name: formData.fullName,
        token: data.token
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Redirect based on user role
      if (formData.role === 'citizen') {
        navigate('/citizen/dashboard');
      } else if (formData.role === 'municipal_admin') {
        navigate('/admin/dashboard');
      } else if (formData.role === 'municipal_worker') {
        navigate('/worker/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0a0b0d',
      backgroundImage: `
        radial-gradient(circle at 20% 50%, rgba(0, 255, 135, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(0, 255, 135, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(0, 255, 135, 0.08) 0%, transparent 50%),
        linear-gradient(135deg, #0a0b0d 0%, #1a1b23 50%, #0a0b0d 100%)
      `,
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background overlay pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: `
          linear-gradient(45deg, transparent 48%, rgba(255, 255, 255, 0.02) 49%, rgba(255, 255, 255, 0.02) 51%, transparent 52%),
          linear-gradient(-45deg, transparent 48%, rgba(255, 255, 255, 0.02) 49%, rgba(255, 255, 255, 0.02) 51%, transparent 52%)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
        zIndex: 1
      }}></div>

      <div style={{
        width: '100%',
        maxWidth: '520px',
        background: 'rgba(26, 27, 35, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 135, 0.1)',
        border: '1px solid rgba(0, 255, 135, 0.1)',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            marginBottom: '20px' 
          }}>
            <i className="fas fa-clipboard-check" style={{ 
              fontSize: '32px', 
              color: '#00ff87', 
              marginRight: '12px' 
            }}></i>
            <h1 style={{ 
              color: '#00ff87', 
              fontSize: '28px', 
              fontWeight: '700', 
              margin: 0 
            }}>
              Municipal Reporter
            </h1>
          </div>
          <h2 style={{ 
            color: '#ffffff', 
            fontSize: '24px', 
            fontWeight: '600', 
            marginBottom: '8px',
            margin: 0
          }}>
            Create Account
          </h2>
          <p style={{ 
            color: '#a0a9b8', 
            fontSize: '16px', 
            margin: 0,
            fontWeight: '400'
          }}>
            Join the Municipal Reporter portal
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '16px', 
            background: 'rgba(220, 38, 38, 0.1)', 
            color: '#ff6b6b', 
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center',
            border: '1px solid rgba(220, 38, 38, 0.2)',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="fullName" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-user" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
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
              placeholder="Enter your full name"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="role" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-user-tag" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Register as
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
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
            >
              <option value="citizen" style={{color: '#333', background: '#fff'}}>Citizen</option>
              <option value="municipal_worker" style={{color: '#333', background: '#fff'}}>Municipal Worker</option>
              <option value="municipal_admin" style={{color: '#333', background: '#fff'}}>Municipal Administrator</option>
            </select>
          </div>
          
          {formData.role === 'municipal_worker' && (
            <div style={{ marginBottom: '20px' }}>
              <label 
                htmlFor="departmentId" 
                style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                <i className="fas fa-building" style={{ marginRight: '8px', color: '#00ff87' }}></i>
                Department
              </label>
              <select
                id="departmentId"
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                required
                disabled={loadingDepts}
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
                  opacity: loadingDepts ? 0.7 : 1
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#00ff87';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0, 255, 135, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(0, 255, 135, 0.2)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="" style={{color: '#333', background: '#fff'}}>Select Department</option>
                {departments.map(dept => (
                  <option key={dept.department_id} value={dept.department_id} style={{color: '#333', background: '#fff'}}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
              {loadingDepts && (
                <div style={{ fontSize: '14px', color: '#a0a9b8', marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                  <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                  Loading departments...
                </div>
              )}
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="username" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-at" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
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
              placeholder="Choose a username"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="email" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-envelope" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
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
              placeholder="Enter your email address"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="phoneNumber" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-phone" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Phone Number
            </label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
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
              placeholder="Enter your phone number"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label 
              htmlFor="password" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-lock" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
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
              placeholder="Create a password"
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label 
              htmlFor="confirmPassword" 
              style={{ 
                display: 'block', 
                marginBottom: '8px', 
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <i className="fas fa-lock" style={{ marginRight: '8px', color: '#00ff87' }}></i>
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
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
              placeholder="Confirm your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading 
                ? 'rgba(0, 255, 135, 0.5)' 
                : 'linear-gradient(135deg, #00ff87, #00d96f)',
              color: '#0a0b0d',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden'
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
                <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                Creating Account...
              </>
            ) : (
              <>
                <i className="fas fa-user-plus" style={{ marginRight: '8px' }}></i>
                Create Account
              </>
            )}
          </button>

          <div style={{ 
            textAlign: 'center', 
            marginTop: '24px',
            fontSize: '14px',
            color: '#a0a9b8' 
          }}>
            Already have an account?{' '}
            <Link 
              to="/login" 
              style={{ 
                color: '#00ff87', 
                textDecoration: 'none', 
                fontWeight: '600',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#00d96f'}
              onMouseLeave={(e) => e.target.style.color = '#00ff87'}
            >
              Sign In
            </Link>
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '20px',
            fontSize: '14px' 
          }}>
            <a 
              href="/"
              style={{ 
                color: '#a0a9b8', 
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.color = '#00ff87';
                e.target.style.background = 'rgba(0, 255, 135, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.color = '#a0a9b8';
                e.target.style.background = 'transparent';
              }}
            >
              <i className="fas fa-arrow-left"></i>
              <span>Back to Home</span>
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
