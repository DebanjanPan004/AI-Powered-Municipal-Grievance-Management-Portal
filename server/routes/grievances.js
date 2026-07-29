import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { pool } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    // Enhanced logging
    console.log('Authentication attempt:', {
      url: req.originalUrl,
      method: req.method,
      authHeaderPresent: !!authHeader,
      headers: Object.keys(req.headers),
      time: new Date().toISOString()
    });
    
    if (!authHeader) {
      console.error('No authorization header present');
      return res.status(401).json({ 
        error: 'No authorization header provided', 
        code: 'NO_AUTH_HEADER' 
      });
    }
    
    // Better token extraction with validation
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.error('Invalid authorization format:', authHeader.substring(0, 20) + '...');
      return res.status(401).json({ 
        error: 'Invalid authorization format. Use Bearer token', 
        code: 'INVALID_AUTH_FORMAT' 
      });
    }
    
    const token = parts[1];
    console.log('Token extracted:', token ? `${token.substring(0, 15)}...` : 'None');
    
    if (!token || token === 'null' || token === 'undefined') {
      console.error('Empty or invalid token provided');
      return res.status(401).json({ 
        error: 'Valid token not provided', 
        code: 'INVALID_TOKEN' 
      });
    }
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('Server configuration error: JWT_SECRET not set');
      return res.status(500).json({ 
        error: 'Server authentication configuration error', 
        code: 'SERVER_CONFIG_ERROR' 
      });
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Token verification failed:', {
          error: err.name,
          message: err.message,
          token: token.substring(0, 10) + '...'
        });
        
        // Provide specific error messages based on JWT error type
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            error: 'Your session has expired. Please login again.', 
            code: 'TOKEN_EXPIRED' 
          });
        } else if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({ 
            error: 'Invalid authentication token. Please login again.', 
            code: 'INVALID_TOKEN' 
          });
        } else if (err.name === 'NotBeforeError') {
          return res.status(403).json({ 
            error: 'Token not yet active.', 
            code: 'TOKEN_NOT_ACTIVE' 
          });
        }
        
        return res.status(403).json({ 
          error: 'Authentication failed. Please login again.', 
          code: 'AUTH_FAILED' 
        });
      }
      
      // Validate required user fields
      if (!user || !user.id || !user.role) {
        console.error('Token payload missing required fields:', user);
        return res.status(403).json({ 
          error: 'Invalid user data in token. Please login again.', 
          code: 'INVALID_TOKEN_PAYLOAD' 
        });
      }
      
      console.log('Token verified successfully for user:', user.id, 'role:', user.role);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication system error. Please try again later.', 
      details: error.message,
      code: 'AUTH_SYSTEM_ERROR' 
    });
  }
};

// Test endpoint for debugging
router.get('/test', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Grievances API is working',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Submit a new grievance with image upload
router.post('/submit', authenticateToken, upload.single('image'), async (req, res) => {
  console.log('=== GRIEVANCE SUBMISSION START ===');
  console.log('User:', req.user);
  console.log('Body:', req.body);
  console.log('File:', req.file ? { 
    fieldname: req.file.fieldname,
    originalname: req.file.originalname,
    filename: req.file.filename,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  
  try {
    const { title, category, description, latitude, longitude, address } = req.body;
    const userId = req.user.id;
    
    console.log('Extracted data:', { title, category, description, latitude, longitude, address, userId });
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }
    
    if (!title || !category || !description || !latitude || !longitude || !address) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missing: {
          title: !title,
          category: !category,
          description: !description,
          latitude: !latitude,
          longitude: !longitude,
          address: !address
        }
      });
    }

    // Get image path relative to uploads directory
    const imagePath = req.file.filename;
    
    console.log('About to insert grievance with simple query:', {
      userId, imagePath, latitude, longitude, address, description
    });
    
    // Use simple INSERT without transactions to avoid isolation issues
    const [insertResult] = await pool.query(
      'INSERT INTO grievances (user_id, image_path, latitude, longitude, address, description, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
      [userId, imagePath, parseFloat(latitude), parseFloat(longitude), address, description, 'pending']
    );
    
    console.log('Insert result:', insertResult);
    
    const grievanceId = insertResult.insertId;
    console.log('New grievance ID:', grievanceId);
    
    if (!grievanceId) {
      throw new Error('Failed to get grievance ID after insertion');
    }

    // Force a commit and flush
    await pool.query('COMMIT');
    console.log('Forced COMMIT executed');
    
    // Verify the data exists
    const [verifyResult] = await pool.query(
      'SELECT grievance_id, user_id, image_path, status, created_at FROM grievances WHERE grievance_id = ?',
      [grievanceId]
    );
    
    console.log('Verification query result:', verifyResult);
    
    if (verifyResult.length === 0) {
      throw new Error('Data not found after insertion - database write failed');
    }
    
    // Also check total count
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM grievances');
    console.log('Total grievances in database:', countResult[0].total);
    
    res.status(201).json({
      message: 'Grievance submitted successfully',
      grievanceId,
      imagePath,
      verification: 'Data confirmed in database'
    });
  } catch (error) {
    console.error('Grievance submission error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
    console.error('Request body:', req.body);
    console.error('File info:', req.file);
    console.error('User info:', req.user);
    
    // Provide more specific error information
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Database table not found. Please check database setup.' });
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Database column mismatch. Please check table structure.' });
    } else if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ error: 'One or more fields exceed maximum length.' });
    } else if (error.code === 'ER_SP_DOES_NOT_EXIST') {
      return res.status(500).json({ error: 'Stored procedure SubmitGrievance does not exist in database.' });
    } else if (error.code === 'ER_SP_WRONG_NO_OF_ARGS') {
      return res.status(500).json({ error: 'Wrong number of arguments for stored procedure.' });
    }
    
    res.status(500).json({ 
      error: 'Failed to submit grievance',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Get all grievances for a citizen
router.get('/citizen', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching grievances for citizen user ID:', userId);
    
    // Verify user is a citizen
    if (req.user.role !== 'citizen') {
      console.log('Access denied: User role is', req.user.role);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all grievances for this user with a simplified query
    // to avoid potential JSON_OBJECT compatibility issues
    const [grievances] = await pool.query(
      `SELECT 
        g.grievance_id, 
        g.image_path, 
        g.latitude, 
        g.longitude, 
        g.address, 
        g.description, 
        g.status, 
        g.created_at,
        g.category
      FROM grievances g
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC`,
      [userId]
    );
    
    console.log(`Found ${grievances.length} grievances for user ${userId}`);
    
    // Add full URL for images
    const grievancesWithUrls = grievances.map(g => ({
      ...g,
      image_path: g.image_path ? `/uploads/${g.image_path}` : null
    }));
    
    res.json({ grievances: grievancesWithUrls });
  } catch (error) {
    console.error('Get grievances error:', error);
    // Send more detailed error for debugging
    res.status(500).json({ 
      error: 'Failed to fetch grievances',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get grievances for a specific user ID (admin or worker only)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Only admin and workers can access other users' grievances
    if (req.user.role !== 'admin' && req.user.role !== 'worker') {
      console.log('Access denied: User role is', req.user.role);
      return res.status(403).json({ error: 'Access denied. Only admins and workers can access other users grievances' });
    }
    
    console.log(`Fetching grievances for user ID: ${userId} by ${req.user.role} (ID: ${req.user.id})`);
    
    // Get all grievances for the specified user
    const [grievances] = await pool.query(
      `SELECT 
        g.grievance_id, 
        g.user_id,
        g.image_path, 
        g.latitude, 
        g.longitude, 
        g.address, 
        g.description, 
        g.status, 
        g.created_at,
        g.category,
        u.username,
        u.full_name
      FROM grievances g
      JOIN users u ON g.user_id = u.user_id
      WHERE g.user_id = ?
      ORDER BY g.created_at DESC`,
      [userId]
    );
    
    console.log(`Found ${grievances.length} grievances for user ${userId}`);
    
    // Add full URL for images
    const grievancesWithUrls = grievances.map(g => ({
      ...g,
      image_path: g.image_path ? `/uploads/${g.image_path}` : null
    }));
    
    // Get user details
    let userDetails = null;
    if (grievances.length > 0) {
      userDetails = {
        userId: grievances[0].user_id,
        username: grievances[0].username,
        fullName: grievances[0].full_name
      };
      
      // Remove redundant user fields from grievances
      grievancesWithUrls.forEach(g => {
        delete g.username;
        delete g.full_name;
      });
    } else {
      // If no grievances found, fetch user details separately
      const [users] = await pool.query(
        'SELECT user_id, username, full_name FROM users WHERE user_id = ?',
        [userId]
      );
      
      if (users.length > 0) {
        userDetails = {
          userId: users[0].user_id,
          username: users[0].username,
          fullName: users[0].full_name
        };
      }
    }
    
    res.json({ 
      user: userDetails,
      grievances: grievancesWithUrls 
    });
  } catch (error) {
    console.error('Get user grievances error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user grievances',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all grievances for admin
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    console.log('Admin requesting grievances, user:', req.user);
    
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      console.error('Access denied: User role is', req.user.role);
      return res.status(403).json({ error: 'Access denied: Admin privileges required', code: 'INSUFFICIENT_PERMISSIONS' });
    }
    
    console.log('Admin verification passed, fetching grievances...');
    
    // Get all grievances with assignment information
    const [grievances] = await pool.query(
      `SELECT 
        g.grievance_id, 
        g.user_id,
        g.image_path, 
        g.latitude, 
        g.longitude, 
        g.address, 
        g.description, 
        g.status, 
        g.created_at,
        g.category,
        u.username,
        u.full_name,
        ga.assignment_id,
        ga.status as assignment_status,
        ga.assigned_at,
        ga.completed_at,
        ga.assigned_by,
        w.full_name as worker_name,
        w.user_id as worker_id,
        adm.full_name as assigned_by_name
      FROM grievances g
      LEFT JOIN users u ON g.user_id = u.user_id
      LEFT JOIN (
        SELECT * FROM grievance_assignments 
        WHERE (grievance_id, assigned_at) IN (
          SELECT grievance_id, MAX(assigned_at) 
          FROM grievance_assignments 
          GROUP BY grievance_id
        )
      ) ga ON g.grievance_id = ga.grievance_id
      LEFT JOIN users w ON ga.worker_id = w.user_id
      LEFT JOIN users adm ON ga.admin_id = adm.user_id
      ORDER BY g.created_at DESC`
    );
    
    console.log('Raw grievances fetched:', grievances.length);
    
    // Add full URL for images and format data
    const grievancesWithUrls = grievances.map(g => ({
      ...g,
      image_path: g.image_path ? `/uploads/${g.image_path}` : null,
      citizen: {
        user_id: g.user_id,
        username: g.username,
        full_name: g.full_name
      },
      assigned_worker: g.worker_id ? {
        user_id: g.worker_id,
        full_name: g.worker_name,
        assignment_status: g.assignment_status,
        assigned_at: g.assigned_at,
        completed_at: g.completed_at,
        assigned_by: g.assigned_by_name
      } : null,
      assignment_details: g.assignment_id ? {
        assignment_id: g.assignment_id,
        status: g.assignment_status,
        assigned_at: g.assigned_at,
        completed_at: g.completed_at,
        assigned_by: g.assigned_by_name
      } : null
    }));
    
    console.log('Processed grievances:', grievancesWithUrls.length);
    
    res.json({ grievances: grievancesWithUrls });
  } catch (error) {
    console.error('Get admin grievances error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    // Provide more detailed error information
    let errorMessage = 'Failed to fetch grievances';
    let statusCode = 500;
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Database table not found. Please contact system administrator.';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Database schema error. Please contact system administrator.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection failed. Please try again later.';
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Get grievance by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const grievanceId = req.params.id;
    
    // Get grievance details
    const [grievances] = await pool.query(
      `SELECT 
        g.grievance_id, 
        g.user_id,
        g.image_path, 
        g.latitude, 
        g.longitude, 
        g.address, 
        g.description, 
        g.status, 
        g.created_at
      FROM grievances g
      WHERE g.grievance_id = ?`,
      [grievanceId]
    );
    
    if (grievances.length === 0) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    
    const grievance = grievances[0];
    
    // Check if user has permission to view this grievance
    if (req.user.role === 'citizen' && grievance.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add full URL for image
    grievance.image_path = grievance.image_path ? `/uploads/${grievance.image_path}` : null;
    
    res.json({ grievance });
  } catch (error) {
    console.error('Get grievance error:', error);
    res.status(500).json({ error: 'Failed to fetch grievance' });
  }
});

// Assign grievance to worker (admin only)
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { grievanceId, workerId } = req.body;
    const adminId = req.user.id;
    
    console.log('Assign request received:', { grievanceId, workerId, adminId });
    
    // Verify user is an admin
    if (req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if grievance exists and is pending
      const [grievances] = await connection.query(
        'SELECT * FROM grievances WHERE grievance_id = ? AND status = "pending"',
        [grievanceId]
      );
      
      if (grievances.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Grievance not found or already assigned' });
      }
      
      // Check if worker exists
      const [workers] = await connection.query(
        'SELECT u.* FROM users u JOIN roles r ON u.role_id = r.role_id WHERE u.user_id = ? AND r.role_name = "municipal_worker"',
        [workerId]
      );
      
      if (workers.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Worker not found' });
      }
      
      // Check if this grievance is already assigned
      const [existingAssignments] = await connection.query(
        'SELECT * FROM grievance_assignments WHERE grievance_id = ? AND status IN ("assigned", "working")',
        [grievanceId]
      );
      
      if (existingAssignments.length > 0) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Grievance is already assigned to a worker' });
      }
      
      // Insert into grievance_assignments table
      const [assignResult] = await connection.query(
        'INSERT INTO grievance_assignments (grievance_id, worker_id, admin_id, assigned_at, status) VALUES (?, ?, ?, NOW(), "assigned")',
        [grievanceId, workerId, adminId]
      );
      
      const assignmentId = assignResult.insertId;
      console.log('Assignment created:', assignmentId);
      
      // Update grievance status to 'assigned'
      await connection.query(
        'UPDATE grievances SET status = "assigned" WHERE grievance_id = ?',
        [grievanceId]
      );
      
      await connection.commit();
      
      console.log('Assignment completed successfully');
      
      res.json({
        message: 'Grievance assigned successfully',
        assignmentId,
        grievanceId,
        workerId,
        status: 'assigned'
      });
    } catch (err) {
      console.error('Transaction error:', err);
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Grievance assignment error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      errno: error.errno
    });
    res.status(500).json({ 
      error: 'Failed to assign grievance', 
      details: error.message,
      sqlDetails: error.sqlMessage,
      code: error.code
    });
  }
});

// Update grievance status (worker only)
router.put('/status/:id', authenticateToken, async (req, res) => {
  try {
    const grievanceId = req.params.id;
    const { status } = req.body;
    
    // Verify user is a worker or admin
    if (req.user.role !== 'municipal_worker' && req.user.role !== 'municipal_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Verify status is valid
    const validStatuses = ['pending', 'working', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update grievance status
    await pool.query(
      'UPDATE grievances SET status = ? WHERE grievance_id = ?',
      [status, grievanceId]
    );
    
    res.json({
      message: 'Grievance status updated successfully'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update grievance status' });
  }
});

// Get worker's assigned grievances
router.get('/worker/assigned', authenticateToken, async (req, res) => {
  try {
    const workerId = req.user.id;
    
    console.log('Worker requesting assigned tasks:', workerId);
    console.log('User role from token:', req.user.role);
    
    // Verify user is a worker - be more flexible with the role check
    if (!req.user.role || (req.user.role !== 'municipal_worker' && req.user.role !== 'worker')) {
      console.log('Access denied. User role:', req.user.role);
      return res.status(403).json({ error: 'Access denied. User role: ' + req.user.role });
    }
    
    // Get assigned grievances
    const [grievances] = await pool.query(
      `SELECT 
        g.grievance_id, 
        g.image_path, 
        g.latitude, 
        g.longitude, 
        g.address, 
        g.description, 
        g.status, 
        g.created_at,
        u.user_id as citizen_id,
        u.username as citizen_username,
        u.full_name as citizen_full_name,
        ga.assignment_id,
        ga.assigned_at,
        ga.status as assignment_status,
        d.department_name as category,
        adm.full_name as assigned_by_name
      FROM grievances g
      JOIN users u ON g.user_id = u.user_id
      JOIN grievance_assignments ga ON g.grievance_id = ga.grievance_id
      LEFT JOIN users w ON ga.worker_id = w.user_id
      LEFT JOIN users adm ON ga.admin_id = adm.user_id
      LEFT JOIN departments d ON w.department_id = d.department_id
      WHERE ga.worker_id = ?
      ORDER BY ga.assigned_at DESC`,
      [workerId]
    );
    
    console.log(`Found ${grievances.length} assigned tasks`);
    
    // Debug the grievances data before processing
    if (grievances.length > 0) {
      console.log('First grievance sample:', {
        id: grievances[0].grievance_id,
        status: grievances[0].status,
        assignment_status: grievances[0].assignment_status
      });
    } else {
      console.log('No grievances found');
    }
    
    // Process the grievances data
    const grievancesWithUrls = grievances.map(g => {
      // Construct citizen object from individual fields
      const citizen = {
        user_id: g.citizen_id || null,
        username: g.citizen_username || 'Unknown',
        full_name: g.citizen_full_name || 'Unknown User'
      };
      
      // Create a clean object with only the needed fields to avoid circular references
      return {
        grievance_id: g.grievance_id,
        image_path: g.image_path ? `/uploads/${g.image_path}` : null,
        latitude: g.latitude,
        longitude: g.longitude,
        address: g.address,
        description: g.description,
        status: g.status,
        created_at: g.created_at,
        assignment_id: g.assignment_id,
        assigned_at: g.assigned_at,
        assignment_status: g.assignment_status,
        category: g.category,
        assigned_by_name: g.assigned_by_name,
        citizen: citizen
      };
    });
    
    res.json({ grievances: grievancesWithUrls });
  } catch (error) {
    console.error('Get worker grievances error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch assigned grievances', 
      details: error.message
    });
  }
});

// Worker assignment status update endpoint
router.put('/assignments/:assignmentId/status', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status } = req.body;
    const workerId = req.user.id;
    
    // Verify user is a worker
    if (req.user.role !== 'municipal_worker') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Validate status
    const validStatuses = ['assigned', 'working', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    // Begin transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if worker is assigned to this grievance
      const [assignmentCheck] = await connection.query(
        'SELECT * FROM grievance_assignments WHERE assignment_id = ? AND worker_id = ?',
        [assignmentId, workerId]
      );
      
      if (assignmentCheck.length === 0) {
        await connection.rollback();
        return res.status(403).json({ error: 'You are not assigned to this grievance' });
      }
      
      // Update the assignment status
      const [updateResult] = await connection.query(
        'UPDATE grievance_assignments SET status = ?, completed_at = ? WHERE assignment_id = ?',
        [status, status === 'completed' ? new Date() : null, assignmentId]
      );
      
      // Update the grievance status if assignment is completed
      if (status === 'completed') {
        await connection.query(
          'UPDATE grievances SET status = "completed" WHERE grievance_id = ?',
          [assignmentCheck[0].grievance_id]
        );
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Assignment status updated successfully',
        status
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Update assignment status error:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
});

export default router;
