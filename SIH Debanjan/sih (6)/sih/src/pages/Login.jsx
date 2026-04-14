import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Login successful
      const userData = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role,
        name: data.user.fullName,
        token: data.token
      };
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      // Redirect based on user role
      if (data.user.role === 'citizen') {
        navigate('/citizen/dashboard');
      } else if (data.user.role === 'municipal_admin') {
        navigate('/admin/dashboard');
      } else if (data.user.role === 'municipal_worker') {
        navigate('/worker/dashboard');
      }
      
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
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
        maxWidth: '420px',
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
            Welcome Back
          </h2>
          <p style={{ 
            color: '#a0a9b8', 
            fontSize: '16px', 
            margin: 0,
            fontWeight: '400'
          }}>
            Sign in to access your account
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
          <div style={{ marginBottom: '24px' }}>
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
              <i className="fas fa-user" style={{ marginRight: '8px', color: '#00ff87' }}></i>
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
              placeholder="Enter your username"
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
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
              placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }}></i>
                Sign In
              </>
            )}
          </button>

          <div style={{ 
            textAlign: 'center', 
            marginTop: '24px',
            fontSize: '14px',
            color: '#a0a9b8' 
          }}>
            Don't have an account?{' '}
            <Link 
              to="/register" 
              style={{ 
                color: '#00ff87', 
                textDecoration: 'none', 
                fontWeight: '600',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#00d96f'}
              onMouseLeave={(e) => e.target.style.color = '#00ff87'}
            >
              Create Account
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

export default Login;
