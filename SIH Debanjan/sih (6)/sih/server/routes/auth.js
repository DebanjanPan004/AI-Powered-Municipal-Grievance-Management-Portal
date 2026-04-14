import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password, email, fullName, phoneNumber, role, departmentId } = req.body;
    
    console.log('Registration request:', { username, email, fullName, phoneNumber, role, departmentId });
    
    // Validate required fields
    if (!username || !password || !email || !fullName || !phoneNumber || !role) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }
    
    // Validate role
    const validRoles = ['citizen', 'municipal_admin', 'municipal_worker'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // If role is municipal_worker, departmentId is required
    if (role === 'municipal_worker' && !departmentId) {
      return res.status(400).json({ error: 'Department is required for workers' });
    }
    
    // Check if username or email already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE username = ? OR email = ?', 
      [username, email]
    );
    
    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Username or email already exists' 
      });
    }
    
    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Get role ID
    const [roles] = await pool.query('SELECT role_id FROM roles WHERE role_name = ?', [role]);
    if (roles.length === 0) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const roleId = roles[0].role_id;
    
    // Insert user directly using INSERT statement
    const [insertResult] = await pool.query(
      `INSERT INTO users (username, password, email, full_name, phone_number, role_id, department_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [username, hashedPassword, email, fullName, phoneNumber, roleId, departmentId || null]
    );
    
    const userId = insertResult.insertId;
    console.log('User created with ID:', userId);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: userId, username, role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      userId,
      token,
      user: {
        id: userId,
        username,
        email,
        fullName,
        role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt for user:', username);
    
    // Input validation
    if (!username || !password) {
      console.warn('Login attempt missing username or password');
      return res.status(400).json({ 
        error: 'Username and password are required', 
        code: 'MISSING_CREDENTIALS' 
      });
    }
    
    // Find user by username
    const [users] = await pool.query(
      'SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.username = ?',
      [username]
    );
    
    if (users.length === 0) {
      console.warn(`Login failed: User '${username}' not found`);
      // Use vague message for security (don't reveal if username exists)
      return res.status(401).json({ 
        error: 'Invalid username or password', 
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    const user = users[0];
    console.log(`User found: ID ${user.user_id}, role: ${user.role_name}`);
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      console.warn(`Login failed: Invalid password for user '${username}'`);
      return res.status(401).json({ 
        error: 'Invalid username or password', 
        code: 'INVALID_CREDENTIALS' 
      });
    }
    
    // Check for JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured!');
      return res.status(500).json({ 
        error: 'Authentication system error', 
        code: 'SERVER_CONFIG_ERROR' 
      });
    }
    
    // Generate JWT token with more claims for better validation
    const token = jwt.sign(
      { 
        id: user.user_id, 
        username: user.username, 
        role: user.role_name,
        email: user.email,
        // Add timestamps for better security
        iat: Math.floor(Date.now() / 1000),
        // Add token version for potential forced logout
        tokenVersion: 1
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'grievance-portal',
        subject: user.user_id.toString()
      }
    );
    
    // Log successful login
    console.log(`User '${username}' (ID: ${user.user_id}) logged in successfully`);
    
    // Return success response with user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        departmentId: user.department_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    // Provide a generic error message to the client
    res.status(500).json({ 
      error: 'Login failed. Please try again later.',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

// Verify token and get user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Check for authorization header
    if (!authHeader) {
      console.warn('Token verification failed: No authorization header');
      return res.status(401).json({ 
        error: 'No authorization header provided', 
        code: 'NO_AUTH_HEADER' 
      });
    }
    
    // Extract token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.warn('Token verification failed: Invalid authorization format');
      return res.status(401).json({ 
        error: 'Invalid authorization format. Use Bearer token', 
        code: 'INVALID_AUTH_FORMAT' 
      });
    }
    
    const token = parts[1];
    
    if (!token || token === 'null' || token === 'undefined') {
      console.warn('Token verification failed: Empty token provided');
      return res.status(401).json({ 
        error: 'Valid token not provided', 
        code: 'INVALID_TOKEN' 
      });
    }
    
    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not configured for token verification!');
      return res.status(500).json({ 
        error: 'Authentication system error', 
        code: 'SERVER_CONFIG_ERROR' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified, decoded payload:', {
      userId: decoded.id,
      username: decoded.username,
      role: decoded.role
    });
    
    // Get user info from database to ensure account still exists and has correct permissions
    const [users] = await pool.query(
      `SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.full_name, 
        r.role_name, 
        u.department_id,
        d.department_name
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id 
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.user_id = ?`,
      [decoded.id]
    );
    
    if (users.length === 0) {
      console.warn(`Token verification failed: User ID ${decoded.id} not found in database`);
      return res.status(404).json({ 
        error: 'User account no longer exists', 
        code: 'USER_NOT_FOUND' 
      });
    }
    
    const user = users[0];
    
    // Verify role in token matches database (detect if permissions changed)
    if (decoded.role !== user.role_name) {
      console.warn(`Token role (${decoded.role}) doesn't match database role (${user.role_name}) for user ${user.username}`);
      return res.status(403).json({ 
        error: 'User role has changed. Please login again.', 
        code: 'ROLE_MISMATCH' 
      });
    }
    
    // Return user info with department name if available
    res.json({
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role_name,
        departmentId: user.department_id,
        departmentName: user.department_name || null
      }
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Your session has expired. Please login again.', 
        code: 'TOKEN_EXPIRED' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token. Please login again.', 
        code: 'INVALID_TOKEN' 
      });
    }
    
    res.status(401).json({ 
      error: 'Authentication failed. Please login again.', 
      code: 'AUTH_FAILED' 
    });
  }
});

// Get all departments (for registration form)
router.get('/departments', async (req, res) => {
  try {
    const [departments] = await pool.query('SELECT department_id, department_name FROM departments ORDER BY department_name');
    res.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

export default router;
